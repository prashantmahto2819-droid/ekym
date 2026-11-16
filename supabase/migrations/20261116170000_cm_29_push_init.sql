-- push-send को एक बार 'init' से बुलाएँ ताकि VAPID चाबियाँ बन जाएँ (pg_net, commit के बाद चलता है)।
select net.http_post(url := 'https://udxdxkyfrqlgdwwqaucu.supabase.co/functions/v1/push-send',
                     body := jsonb_build_object('action', 'init'), headers := jsonb_build_object('Content-Type', 'application/json'), timeout_milliseconds := 20000);
