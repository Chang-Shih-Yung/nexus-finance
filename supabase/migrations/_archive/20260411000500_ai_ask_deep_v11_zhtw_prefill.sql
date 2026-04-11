-- nf_ai_ask_deep v1.1 — zh-TW labels + prefill trick + tolerant parser.
--
-- Bug observed after v1.0 shipped:
--   * Gemma 4 31B output a full English chain-of-thought preamble, then
--     wrote the real answer using `*Trend:*` markdown bold (not the
--     `TREND:` label we demanded), in English.
--   * Our strict `^TREND\s*[:：]` regex missed it completely, so the
--     fallback dumped the entire raw text (prompt echo included) into
--     the `trend` field and LEFT(1500)'d it with `…`. User saw English +
--     prompt echo + "Kao…" truncation.
--
-- Root causes identified:
--   1. English section labels (TREND / OBSERVATIONS / ...) triggered
--      code-switch. Model mirrored the label language.
--   2. Masked data contains English branch names (Hsinchu, Tainan) which
--      further reinforced English.
--   3. Instructions-before-data means the model weighs the later tokens
--      (data) more heavily and starts speaking in its dialect.
--   4. Gemma 4 31B treats instruction-heavy prompts as "documents to
--      summarise" rather than "rules to follow" — hence the full prompt
--      echo at the top.
--   5. Fallback path hard-truncated at 1500 chars with "…" — user
--      explicitly said "前端要全部呈現".
--
-- Fixes:
--   1. Section labels switched to zh-TW full-width brackets:
--      【趨勢】/【觀察】/【建議】/【風險】. Gemma is less likely to
--      translate these since they're not tokenised as English words.
--   2. Data block moved BEFORE the instructions so recency bias pulls
--      the model towards following the format rules that come last.
--   3. Gemini multi-turn prefill: append a `role: model` turn with
--      "【趨勢】\n" pre-written. Gemma continues from that cursor,
--      which skips any preamble/echo and forces it onto the structure.
--   4. Parser accepts zh-TW brackets AND tolerates common noise:
--      leading bullet markers (*, -, •), markdown bold (**), extra
--      spaces. Strips markdown bold wrappers from body text.
--   5. Fallback no longer truncates. If parsing fails we dump the
--      whole raw text into `trend` and let the frontend scroll.

CREATE OR REPLACE FUNCTION public.nf_ai_ask_deep(
  p_question text,
  p_rpc_name text,
  p_data     jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_api_key      text;
  v_model        text := 'gemma-4-31b-it';
  v_endpoint     text;
  v_existing_sub text;
  v_masked       jsonb;
  v_row_count    int;
  v_data_blob    text;
  v_prompt       text;
  v_body         jsonb;
  v_resp         extensions.http_response;
  v_json         jsonb;
  v_raw_text     text;
  v_section      text;
  v_buf          text := '';
  v_trend        text;
  v_obs          text;
  v_recs         text;
  v_risks        text;
  v_line         text;
  v_trimmed      text;
BEGIN
  -- ── Input guards ─────────────────────────────────────────────
  IF p_question IS NULL OR trim(p_question) = '' THEN
    RETURN jsonb_build_object(
      'error', 'missing_question',
      'trend', NULL, 'observations', NULL,
      'recommendations', NULL, 'risks', NULL
    );
  END IF;

  IF p_data IS NULL OR jsonb_typeof(p_data) <> 'array'
     OR jsonb_array_length(p_data) = 0 THEN
    RETURN jsonb_build_object(
      'error', 'empty_data',
      'trend', NULL, 'observations', NULL,
      'recommendations', NULL, 'risks', NULL
    );
  END IF;

  BEGIN
    v_existing_sub := current_setting('request.jwt.claim.sub', true);
  EXCEPTION WHEN OTHERS THEN
    v_existing_sub := NULL;
  END;
  IF v_existing_sub IS NULL OR v_existing_sub = '' THEN
    PERFORM set_config('request.jwt.claim.sub',
                       '00000000-0000-0000-0000-000000000000', true);
  END IF;

  SELECT decrypted_secret INTO v_api_key
  FROM vault.decrypted_secrets
  WHERE name = 'google_ai_api_key'
  LIMIT 1;

  IF v_api_key IS NULL OR v_api_key = '' THEN
    RETURN jsonb_build_object(
      'error', 'missing_api_key',
      'trend', NULL, 'observations', NULL,
      'recommendations', NULL, 'risks', NULL
    );
  END IF;

  BEGIN
    PERFORM extensions.http_set_curlopt('CURLOPT_TIMEOUT_MS', '60000');
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  v_endpoint := format(
    'https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s',
    v_model, v_api_key
  );

  -- ── PII mask + row cap ───────────────────────────────────────
  v_masked := public.nf_mask_pii(p_data);
  v_row_count := jsonb_array_length(v_masked);

  IF v_row_count > 50 THEN
    SELECT jsonb_agg(elem)
      INTO v_masked
      FROM (
        SELECT elem
        FROM jsonb_array_elements(v_masked) WITH ORDINALITY AS t(elem, ord)
        WHERE ord <= 50
      ) s;
  END IF;

  v_data_blob := v_masked::text;

  -- ── Prompt: data first, instructions last, zh-TW labels ──────
  -- Order matters: transformer attends more to recent tokens, so we
  -- put the format rules at the end where they have the most pull.
  v_prompt := format(
E'以下是使用者查詢的業務資料，來源 RPC：%s，共 %s 筆（已做 PII 遮罩）：\n\n%s\n\n' ||
E'---\n\n' ||
E'使用者原本的問題：%s\n\n' ||
E'你是 Nexus Finance 的資深資料分析師，正在為執行副總（EVP）級讀者寫一份深度解讀。\n' ||
E'請用**繁體中文（台灣商業用語）**回答，嚴格依照以下四段結構輸出，不要加任何前言、不要重複題目、不要列出 JSON：\n\n' ||
E'【趨勢】\n' ||
E'一段文字描述整體趨勢，80 到 120 字，可引用具體數字、百分比或分行名稱。\n\n' ||
E'【觀察】\n' ||
E'- 觀察一\n' ||
E'- 觀察二\n' ||
E'- 觀察三（可選）\n\n' ||
E'【建議】\n' ||
E'- 對執行副總的可行動建議一\n' ||
E'- 建議二\n' ||
E'- 建議三（可選）\n\n' ||
E'【風險】\n' ||
E'- 潛在風險或需留意的訊號一\n' ||
E'- 風險二（可選）\n\n' ||
E'格式硬性要求：\n' ||
E'1. 四個段落標題必須完全是「【趨勢】」「【觀察】」「【建議】」「【風險】」，不可翻譯、不可改用 markdown。\n' ||
E'2. 不要使用 **粗體** 或 # 標題符號，條列只用「- 」。\n' ||
E'3. 全部使用繁體中文，禁止任何英文句子或英文括號翻譯。\n' ||
E'4. 若資料無明顯風險，寫「目前尚無顯著風險」，不可留空。\n' ||
E'5. 直接從「【趨勢】」開始寫，不要打招呼、不要重述資料。',
    p_rpc_name,
    v_row_count,
    v_data_blob,
    p_question
  );

  -- ── Build body with prefill trick ───────────────────────────
  -- Gemini API accepts multi-turn contents alternating user/model.
  -- We append a pre-filled model turn that starts with "【趨勢】\n"
  -- so Gemma resumes from that cursor — no preamble, no echo.
  v_body := jsonb_build_object(
    'contents', jsonb_build_array(
      jsonb_build_object(
        'role', 'user',
        'parts', jsonb_build_array(
          jsonb_build_object('text', v_prompt)
        )
      ),
      jsonb_build_object(
        'role', 'model',
        'parts', jsonb_build_array(
          jsonb_build_object('text', E'【趨勢】\n')
        )
      )
    ),
    'generationConfig', jsonb_build_object(
      'temperature', 0.35,
      'maxOutputTokens', 1400
    )
  );

  BEGIN
    SELECT * INTO v_resp
    FROM extensions.http((
      'POST',
      v_endpoint,
      ARRAY[extensions.http_header('Content-Type', 'application/json')],
      'application/json',
      v_body::text
    )::extensions.http_request);
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'error', 'http_failed: ' || SQLERRM,
      'trend', NULL, 'observations', NULL,
      'recommendations', NULL, 'risks', NULL,
      'model_used', v_model
    );
  END;

  IF v_resp.status <> 200 THEN
    RETURN jsonb_build_object(
      'error', format('http_status_%s', v_resp.status),
      'message', left(v_resp.content, 500),
      'trend', NULL, 'observations', NULL,
      'recommendations', NULL, 'risks', NULL,
      'model_used', v_model
    );
  END IF;

  BEGIN
    v_json := v_resp.content::jsonb;
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'error', 'invalid_json',
      'trend', NULL, 'observations', NULL,
      'recommendations', NULL, 'risks', NULL,
      'model_used', v_model
    );
  END;

  v_raw_text := v_json #>> '{candidates,0,content,parts,0,text}';

  IF v_raw_text IS NULL OR trim(v_raw_text) = '' THEN
    RETURN jsonb_build_object(
      'error', 'empty_response',
      'trend', NULL, 'observations', NULL,
      'recommendations', NULL, 'risks', NULL,
      'model_used', v_model
    );
  END IF;

  -- Prefill: we pre-wrote "【趨勢】\n" in the model turn, so Gemma's
  -- response starts with the BODY of the trend section. Prepend the
  -- label back so the parser state-machine can seed itself.
  v_raw_text := E'【趨勢】\n' || v_raw_text;

  -- ── Parse four sections ─────────────────────────────────────
  -- State-machine walker. Tolerates:
  --   * leading bullet markers (*, -, •) before a label
  --   * optional markdown bold **【趨勢】**
  --   * spaces between brackets and text
  --   * both zh-TW 【】 and half-width [ ]
  v_section := NULL;
  FOREACH v_line IN ARRAY string_to_array(v_raw_text, E'\n')
  LOOP
    -- Normalize: strip leading bullets + markdown bold stars around labels.
    v_trimmed := regexp_replace(v_line, '^[\s\*\-•·]+', '');
    v_trimmed := regexp_replace(v_trimmed, '\*\*', '', 'g');

    IF v_trimmed ~ '^[【\[]\s*趨勢\s*[】\]]' THEN
      IF v_section = 'trend'              THEN v_trend := trim(v_buf);
      ELSIF v_section = 'observations'    THEN v_obs   := trim(v_buf);
      ELSIF v_section = 'recommendations' THEN v_recs  := trim(v_buf);
      ELSIF v_section = 'risks'           THEN v_risks := trim(v_buf);
      END IF;
      v_section := 'trend';
      v_buf := trim(regexp_replace(v_trimmed, '^[【\[]\s*趨勢\s*[】\]]\s*', ''));
      CONTINUE;
    ELSIF v_trimmed ~ '^[【\[]\s*觀察\s*[】\]]' THEN
      IF v_section = 'trend'              THEN v_trend := trim(v_buf);
      ELSIF v_section = 'observations'    THEN v_obs   := trim(v_buf);
      ELSIF v_section = 'recommendations' THEN v_recs  := trim(v_buf);
      ELSIF v_section = 'risks'           THEN v_risks := trim(v_buf);
      END IF;
      v_section := 'observations';
      v_buf := trim(regexp_replace(v_trimmed, '^[【\[]\s*觀察\s*[】\]]\s*', ''));
      CONTINUE;
    ELSIF v_trimmed ~ '^[【\[]\s*建議\s*[】\]]' THEN
      IF v_section = 'trend'              THEN v_trend := trim(v_buf);
      ELSIF v_section = 'observations'    THEN v_obs   := trim(v_buf);
      ELSIF v_section = 'recommendations' THEN v_recs  := trim(v_buf);
      ELSIF v_section = 'risks'           THEN v_risks := trim(v_buf);
      END IF;
      v_section := 'recommendations';
      v_buf := trim(regexp_replace(v_trimmed, '^[【\[]\s*建議\s*[】\]]\s*', ''));
      CONTINUE;
    ELSIF v_trimmed ~ '^[【\[]\s*風險\s*[】\]]' THEN
      IF v_section = 'trend'              THEN v_trend := trim(v_buf);
      ELSIF v_section = 'observations'    THEN v_obs   := trim(v_buf);
      ELSIF v_section = 'recommendations' THEN v_recs  := trim(v_buf);
      ELSIF v_section = 'risks'           THEN v_risks := trim(v_buf);
      END IF;
      v_section := 'risks';
      v_buf := trim(regexp_replace(v_trimmed, '^[【\[]\s*風險\s*[】\]]\s*', ''));
      CONTINUE;
    END IF;

    -- Accumulate body lines inside current section.
    IF v_section IS NOT NULL THEN
      -- Strip markdown bold inline.
      v_line := regexp_replace(v_line, '\*\*([^*]+)\*\*', '\1', 'g');
      IF v_buf = '' THEN
        v_buf := v_line;
      ELSE
        v_buf := v_buf || E'\n' || v_line;
      END IF;
    END IF;
  END LOOP;

  -- Flush final section.
  IF v_section = 'trend'              THEN v_trend := trim(v_buf);
  ELSIF v_section = 'observations'    THEN v_obs   := trim(v_buf);
  ELSIF v_section = 'recommendations' THEN v_recs  := trim(v_buf);
  ELSIF v_section = 'risks'           THEN v_risks := trim(v_buf);
  END IF;

  -- ── Fallback: if parser still found nothing (very rare after
  -- prefill), dump the raw model output into `trend` UNTRUNCATED.
  -- Frontend will render the whole thing and the user sees every word.
  IF v_trend IS NULL AND v_obs IS NULL
     AND v_recs IS NULL AND v_risks IS NULL THEN
    -- Strip the prefill we prepended so we don't ship "【趨勢】" twice.
    v_trend := trim(regexp_replace(v_raw_text, '^【趨勢】\s*', ''));
  END IF;

  -- Empty-string → NULL so frontend skips the section cleanly.
  IF v_trend = '' THEN v_trend := NULL; END IF;
  IF v_obs   = '' THEN v_obs   := NULL; END IF;
  IF v_recs  = '' THEN v_recs  := NULL; END IF;
  IF v_risks = '' THEN v_risks := NULL; END IF;

  RETURN jsonb_build_object(
    'trend',           v_trend,
    'observations',    v_obs,
    'recommendations', v_recs,
    'risks',           v_risks,
    'model_used',      v_model,
    'error',           NULL
  );
END;
$$;

REVOKE ALL ON FUNCTION public.nf_ai_ask_deep(text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.nf_ai_ask_deep(text, text, jsonb) TO authenticated;
