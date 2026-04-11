-- nf_ai_ask_deep v1.3 — lift PostgREST statement_timeout to 120s.
--
-- Problem: users were hitting `57014 canceling statement due to statement
-- timeout` when clicking 深度解讀 on larger result sets. Root cause is
-- the PostgREST `authenticated` role defaulting statement_timeout to 8s;
-- Gemma 4 31B cold-starts on a 40-row prompt can take 15-30s easily.
-- The curl timeout we already raised (CURLOPT_TIMEOUT_MS = 60000) had
-- no effect because Postgres cut the whole transaction before curl even
-- got a chance to finish.
--
-- Fix: `SET LOCAL statement_timeout = '120s'` at the top of the function.
-- `LOCAL` means it only applies to the current transaction — no role or
-- database-wide pollution. 120s gives us headroom; we still keep the
-- Gemma-side curl timeout at 90s so slow connections fail fast rather
-- than holding the transaction open to the wire.
--
-- No other behavioural changes. The few-shot prompt + prefill + parser
-- from v1.2 are preserved verbatim.

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
  v_degraded     boolean := false;
  v_degrade_reason text;
BEGIN
  -- Lift PostgREST authenticated role's 8s statement_timeout. LOCAL
  -- scope = this transaction only, no role/DB pollution.
  SET LOCAL statement_timeout = '120s';

  IF p_question IS NULL OR trim(p_question) = '' THEN
    RETURN jsonb_build_object(
      'error', 'missing_question',
      'trend', NULL, 'observations', NULL,
      'recommendations', NULL, 'risks', NULL,
      'degraded', true, 'degrade_reason', 'missing_question'
    );
  END IF;

  IF p_data IS NULL OR jsonb_typeof(p_data) <> 'array'
     OR jsonb_array_length(p_data) = 0 THEN
    RETURN jsonb_build_object(
      'error', 'empty_data',
      'trend', NULL, 'observations', NULL,
      'recommendations', NULL, 'risks', NULL,
      'degraded', true, 'degrade_reason', 'empty_data'
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
      'recommendations', NULL, 'risks', NULL,
      'degraded', true, 'degrade_reason', 'missing_api_key'
    );
  END IF;

  BEGIN
    PERFORM extensions.http_set_curlopt('CURLOPT_TIMEOUT_MS', '90000');
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  v_endpoint := format(
    'https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s',
    v_model, v_api_key
  );

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

  v_prompt := format(
E'以下是使用者查詢的業務資料，來源 RPC：%s，共 %s 筆（已做 PII 遮罩）：\n\n%s\n\n' ||
E'---\n\n' ||
E'使用者原本的問題：%s\n\n' ||
E'你是 Nexus Finance 的資深資料分析師，為執行副總（EVP）撰寫深度解讀。\n' ||
E'請用繁體中文（台灣商業用語）輸出四段分析，嚴格照以下範例的格式。\n\n' ||
E'═══ 格式範例（不同主題，僅供格式參考）═══\n\n' ||
E'【趨勢】\n' ||
E'本季放款組合整體成長 8.3%%，其中企業金融貢獻最大（+12.1%%），個人金融持平，房貸業務微幅下滑 1.2%%。放款集中度相較上季提高，前三大產業佔整體餘額 52%%。\n\n' ||
E'【觀察】\n' ||
E'- 企業金融成長主要來自製造業與科技業客戶，兩者合計貢獻 7 成新增餘額\n' ||
E'- 房貸下滑與升息循環有關，新增件數較上季減少 18%%\n' ||
E'- NPL 比率維持在 0.42%%，資產品質尚屬穩健\n\n' ||
E'【建議】\n' ||
E'- 持續深化製造業與科技業客群，目標本季再增 5%% 餘額\n' ||
E'- 房貸部門可推出固定利率專案因應升息疑慮\n' ||
E'- 評估是否需要對前三大產業設置集中度上限\n\n' ||
E'【風險】\n' ||
E'- 放款集中度提高會放大單一產業景氣循環的衝擊\n' ||
E'- 升息若持續，房貸量能恐進一步萎縮\n\n' ||
E'═══ 範例結束 ═══\n\n' ||
E'現在請根據上方的真實資料，以相同的四段格式回答使用者的問題。\n' ||
E'硬性要求：\n' ||
E'1. 四個段落標題必須是「【趨勢】」「【觀察】」「【建議】」「【風險】」，不得翻譯為 TREND 等英文。\n' ||
E'2. 不要使用 **粗體** 或 # 符號，條列只用「- 」。\n' ||
E'3. 全部繁體中文，禁止英文句子。\n' ||
E'4. 不要前言、不要重述題目、不要複述範例。直接從「【趨勢】」開始寫。',
    p_rpc_name,
    v_row_count,
    v_data_blob,
    p_question
  );

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
      'model_used', v_model,
      'degraded', true, 'degrade_reason', 'http_failed'
    );
  END;

  IF v_resp.status <> 200 THEN
    RETURN jsonb_build_object(
      'error', format('http_status_%s', v_resp.status),
      'message', left(v_resp.content, 500),
      'trend', NULL, 'observations', NULL,
      'recommendations', NULL, 'risks', NULL,
      'model_used', v_model,
      'degraded', true,
      'degrade_reason', format('http_status_%s', v_resp.status)
    );
  END IF;

  BEGIN
    v_json := v_resp.content::jsonb;
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'error', 'invalid_json',
      'trend', NULL, 'observations', NULL,
      'recommendations', NULL, 'risks', NULL,
      'model_used', v_model,
      'degraded', true, 'degrade_reason', 'invalid_json'
    );
  END;

  v_raw_text := v_json #>> '{candidates,0,content,parts,0,text}';

  IF v_raw_text IS NULL OR trim(v_raw_text) = '' THEN
    RETURN jsonb_build_object(
      'error', 'empty_response',
      'trend', NULL, 'observations', NULL,
      'recommendations', NULL, 'risks', NULL,
      'model_used', v_model,
      'degraded', true, 'degrade_reason', 'empty_response'
    );
  END IF;

  v_raw_text := E'【趨勢】\n' || v_raw_text;

  v_section := NULL;
  FOREACH v_line IN ARRAY string_to_array(v_raw_text, E'\n')
  LOOP
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

    IF v_section IS NOT NULL THEN
      v_line := regexp_replace(v_line, '\*\*([^*]+)\*\*', '\1', 'g');
      IF v_buf = '' THEN
        v_buf := v_line;
      ELSE
        v_buf := v_buf || E'\n' || v_line;
      END IF;
    END IF;
  END LOOP;

  IF v_section = 'trend'              THEN v_trend := trim(v_buf);
  ELSIF v_section = 'observations'    THEN v_obs   := trim(v_buf);
  ELSIF v_section = 'recommendations' THEN v_recs  := trim(v_buf);
  ELSIF v_section = 'risks'           THEN v_risks := trim(v_buf);
  END IF;

  IF v_trend IS NULL AND v_obs IS NULL
     AND v_recs IS NULL AND v_risks IS NULL THEN
    v_trend := trim(regexp_replace(v_raw_text, '^【趨勢】\s*', ''));
    v_degraded := true;
    v_degrade_reason := 'parse_failed';
  END IF;

  IF v_degraded = false
     AND (v_trend IS NULL OR v_obs IS NULL OR v_recs IS NULL) THEN
    v_degraded := true;
    v_degrade_reason := 'sections_incomplete';
  END IF;

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
    'degraded',        v_degraded,
    'degrade_reason',  v_degrade_reason,
    'error',           NULL
  );
END;
$$;

REVOKE ALL ON FUNCTION public.nf_ai_ask_deep(text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.nf_ai_ask_deep(text, text, jsonb) TO authenticated;
