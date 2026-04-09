-- Seed: Add pending transactions for Upcoming Payments card demo
-- Uses existing users (IDs 1-20)

INSERT INTO transactions (user_id, amount, currency, from_account, to_account, status, category, channel, created_at)
VALUES
  (1,   1250.00, 'TWD', 'CHK-001', 'SAV-002', 'pending', 'transfer', 'web',    NOW() + INTERVAL '2 days'),
  (3,  18500.00, 'TWD', 'CHK-003', 'EXT-100', 'pending', 'payment',  'mobile', NOW() + INTERVAL '5 days'),
  (5,   4200.00, 'TWD', 'CHK-005', 'EXT-201', 'pending', 'payment',  'web',    NOW() + INTERVAL '7 days'),
  (8,  65000.00, 'TWD', 'WLT-008', 'EXT-300', 'pending', 'loan',     'web',    NOW() + INTERVAL '10 days'),
  (12,  8800.00, 'TWD', 'CHK-012', 'SAV-012', 'pending', 'transfer', 'atm',    NOW() + INTERVAL '3 days'),
  (15, 32000.00, 'TWD', 'WLT-015', 'EXT-400', 'pending', 'withdrawal','mobile', NOW() + INTERVAL '1 day'),
  (2,   3600.00, 'TWD', 'CHK-002', 'EXT-500', 'pending', 'deposit',  'web',    NOW() + INTERVAL '4 days');
