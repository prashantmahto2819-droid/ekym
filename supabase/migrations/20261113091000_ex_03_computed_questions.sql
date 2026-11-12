-- Kalchuri One (owner, 2026-11-13): computed question generator for the level programme.
-- Maths (school, by class band), quantitative aptitude and reasoning questions are produced from templates with random numbers,
-- so the answer is always calculated, never guessed. Bilingual (question + question_hi; numeric options need no translation).
-- ex_gen_computed(org, per) adds about `per` questions per template × level (dedupe by qhash), status 'active', source 'seed'.
-- Admin can run it again any time (प्रश्न-बैंक → "गणित/तर्क के प्रश्न अपने-आप बनाएँ") to grow the bank.
-- Applied via MCP. Additive only.

alter table public.ex_questions add column if not exists explanation_hi text;

-- insert one MCQ: 3 distractors are made unique, options shuffled, correct index recorded; Hindi options/units kept aligned
create or replace function public.ex_mk_num(p_org uuid, p_subject text, p_topic text, p_level int, p_cf int, p_ct int,
                                            p_q_hi text, p_q_en text, p_ans text, p_wrong text[], p_expl text,
                                            p_unit_en text default '', p_unit_hi text default '', p_ans_hi text default null, p_wrong_hi text[] default null)
returns boolean language plpgsql security definer set search_path = '' as $$
declare en text[] := array[p_ans]; hi text[] := array[coalesce(p_ans_hi, p_ans)]; i int; perm int[]; o_en text[]; o_hi text[]; ci int; h text; same boolean;
begin
  for i in 1 .. coalesce(array_length(p_wrong, 1), 0) loop
    if p_wrong[i] is not null and p_wrong[i] <> '' and not (p_wrong[i] = any(en)) and array_length(en, 1) < 4 then
      en := en || p_wrong[i]; hi := hi || coalesce(p_wrong_hi[i], p_wrong[i]);
    end if;
  end loop;
  if array_length(en, 1) < 4 then return false; end if;
  perm := array(select g from generate_series(1, 4) g order by random());
  o_en := array(select en[p] || case when p_unit_en <> '' then ' ' || p_unit_en else '' end from unnest(perm) with ordinality u(p, k) order by k);
  o_hi := array(select hi[p] || case when p_unit_hi <> '' then ' ' || p_unit_hi else '' end from unnest(perm) with ordinality u(p, k) order by k);
  ci := array_position(perm, 1) - 1;
  same := o_en = o_hi;
  h := md5(p_subject || '|' || p_q_en || '|' || p_ans);
  insert into public.ex_questions (organization_id, subject, topic, class_from, class_to, difficulty, level, lang, qtype, question, question_hi, options, options_hi, correct, explanation_hi, status, source, qhash)
  values (p_org, p_subject, p_topic, p_cf, p_ct, case when p_level <= 2 then 'easy' when p_level = 3 then 'medium' else 'hard' end, p_level, 'hi', 'mcq',
          p_q_en, p_q_hi, to_jsonb(o_en), case when same then null else to_jsonb(o_hi) end, jsonb_build_array(ci), p_expl, 'active', 'seed', h)
  on conflict do nothing;
  return found;
end $$;
revoke execute on function public.ex_mk_num(uuid, text, text, int, int, int, text, text, text, text[], text, text, text, text, text[]) from public, anon, authenticated;

create or replace function public.ex_gen_computed(p_org uuid, p_per int default 40)
returns int language plpgsql security definer set search_path = '' as $$
declare
  n int := 0; i int; a int; b int; c int; d int; x int; r numeric; s text; t text; k int; arr int[]; dt date;
  days_hi text[] := array['रविवार','सोमवार','मंगलवार','बुधवार','गुरुवार','शुक्रवार','शनिवार'];
  days_en text[] := array['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  alpha text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  ok boolean;
begin
  if not (core.is_platform_admin() or public.ex_can_manage(p_org) or session_user in ('postgres', 'supabase_admin')) then raise exception 'Not allowed'; end if;
  for i in 1 .. p_per loop
    -- ===== school maths, class 1–2 =====
    a := 1 + floor(random() * 9)::int; b := 1 + floor(random() * 9)::int;
    ok := public.ex_mk_num(p_org, 'math', 'जोड़', 1, 1, 2, a || ' + ' || b || ' = ?', a || ' + ' || b || ' = ?', (a + b)::text, array[(a + b + 1)::text, (a + b - 1)::text, (a + b + 2)::text, (a + b + 10)::text], a || ' और ' || b || ' को जोड़ने पर ' || (a + b)); n := n + ok::int;
    a := 10 + floor(random() * 10)::int; b := 1 + floor(random() * 9)::int;
    ok := public.ex_mk_num(p_org, 'math', 'घटाव', 2, 1, 2, a || ' − ' || b || ' = ?', a || ' − ' || b || ' = ?', (a - b)::text, array[(a - b + 1)::text, (a - b - 1)::text, (a + b)::text, (a - b + 2)::text], a || ' में से ' || b || ' घटाने पर ' || (a - b)); n := n + ok::int;
    a := 10 * (1 + floor(random() * 5)::int) + floor(random() * 5)::int; b := 10 * (1 + floor(random() * 4)::int) + floor(random() * 5)::int;
    ok := public.ex_mk_num(p_org, 'math', 'जोड़', 3, 1, 2, a || ' + ' || b || ' = ?', a || ' + ' || b || ' = ?', (a + b)::text, array[(a + b + 10)::text, (a + b - 10)::text, (a + b + 1)::text, (a + b - 1)::text], 'इकाई और दहाई अलग-अलग जोड़ें: ' || (a + b)); n := n + ok::int;
    a := 10 + floor(random() * 89)::int;
    ok := public.ex_mk_num(p_org, 'math', 'स्थानीय मान', 4, 1, 2, a || ' में दहाई का अंक कौन-सा है?', 'What is the tens digit in ' || a || '?', (a / 10)::text, array[(a % 10)::text, ((a / 10) % 9 + 1)::text, ((a / 10 + 2) % 10)::text, ((a % 10 + 3) % 10)::text, ((a / 10 + 5) % 10)::text], a || ' = ' || (a / 10) || ' दहाई + ' || (a % 10) || ' इकाई'); n := n + ok::int;
    a := 2 + floor(random() * 4)::int; b := 1 + floor(random() * 10)::int;
    ok := public.ex_mk_num(p_org, 'math', 'पहाड़ा', 5, 1, 2, a || ' × ' || b || ' = ?', a || ' × ' || b || ' = ?', (a * b)::text, array[(a * b + a)::text, (a * b - a)::text, (a + b)::text, (a * b + 1)::text], a || ' का पहाड़ा: ' || a || ' × ' || b || ' = ' || (a * b)); n := n + ok::int;

    -- ===== school maths, class 3–5 =====
    a := 10 + floor(random() * 89)::int; b := 10 + floor(random() * 89)::int;
    ok := public.ex_mk_num(p_org, 'math', 'जोड़', 1, 3, 5, a || ' + ' || b || ' = ?', a || ' + ' || b || ' = ?', (a + b)::text, array[(a + b + 10)::text, (a + b - 1)::text, (a + b + 1)::text, (a + b - 10)::text], 'जोड़ = ' || (a + b)); n := n + ok::int;
    a := 2 + floor(random() * 9)::int; b := 2 + floor(random() * 9)::int;
    ok := public.ex_mk_num(p_org, 'math', 'गुणा', 2, 3, 5, a || ' × ' || b || ' = ?', a || ' × ' || b || ' = ?', (a * b)::text, array[(a * b + a)::text, (a * b - b)::text, (a * (b + 1))::text, (a * b + 2)::text], a || ' × ' || b || ' = ' || (a * b)); n := n + ok::int;
    b := 2 + floor(random() * 8)::int; c := 2 + floor(random() * 11)::int; a := b * c;
    ok := public.ex_mk_num(p_org, 'math', 'भाग', 3, 3, 5, a || ' ÷ ' || b || ' = ?', a || ' ÷ ' || b || ' = ?', c::text, array[(c + 1)::text, (c - 1)::text, (c + 2)::text, (b)::text], b || ' × ' || c || ' = ' || a || ', इसलिए उत्तर ' || c); n := n + ok::int;
    a := 100 + floor(random() * 800)::int; b := 100 + floor(random() * (a - 100))::int;
    ok := public.ex_mk_num(p_org, 'math', 'घटाव', 4, 3, 5, a || ' − ' || b || ' = ?', a || ' − ' || b || ' = ?', (a - b)::text, array[(a - b + 10)::text, (a - b - 10)::text, (a - b + 100)::text, (a - b + 1)::text], a || ' − ' || b || ' = ' || (a - b)); n := n + ok::int;
    a := 3 + floor(random() * 15)::int; b := 2 + floor(random() * 10)::int;
    ok := public.ex_mk_num(p_org, 'math', 'परिमाप', 5, 3, 5, 'एक आयत की लंबाई ' || a || ' सेमी और चौड़ाई ' || b || ' सेमी है। उसका परिमाप कितना है?', 'A rectangle is ' || a || ' cm long and ' || b || ' cm wide. What is its perimeter?', (2 * (a + b))::text, array[(a * b)::text, (a + b)::text, (2 * (a + b) + 2)::text, (4 * a)::text], 'परिमाप = 2 × (ल + चौ) = 2 × ' || (a + b) || ' = ' || (2 * (a + b)) || ' सेमी', 'cm', 'सेमी'); n := n + ok::int;

    -- ===== school maths, class 6–8 =====
    a := 2 + floor(random() * 14)::int; b := 2 + floor(random() * 14)::int;
    if a <> b then
      c := (a * b) / gcd(a, b);
      ok := public.ex_mk_num(p_org, 'math', 'लघुत्तम समापवर्त्य', 1, 6, 8, a || ' और ' || b || ' का लघुत्तम समापवर्त्य क्या है?', 'What is the LCM of ' || a || ' and ' || b || '?', c::text, array[(a * b + a)::text, gcd(a, b)::text, (c * 2)::text, (a + b)::text, (c + a)::text], 'ल.स. = ' || a || ' × ' || b || ' ÷ म.स.(' || gcd(a, b) || ') = ' || c); n := n + ok::int;
    end if;
    d := 2 + floor(random() * 9)::int; a := d * (2 + floor(random() * 9)::int); b := d * (2 + floor(random() * 9)::int);
    if a <> b then
      ok := public.ex_mk_num(p_org, 'math', 'महत्तम समापवर्तक', 2, 6, 8, a || ' और ' || b || ' का महत्तम समापवर्तक क्या है?', 'What is the HCF of ' || a || ' and ' || b || '?', gcd(a, b)::text, array[(gcd(a, b) * 2)::text, (gcd(a, b) + 1)::text, ((a * b) / gcd(a, b))::text, greatest(1, gcd(a, b) - 1)::text, '1'], 'दोनों को पूरा बाँटने वाली सबसे बड़ी संख्या ' || gcd(a, b)); n := n + ok::int;
    end if;
    a := (array[5, 10, 12, 15, 20, 25, 30, 40, 50, 75])[1 + floor(random() * 10)::int]; b := 20 * (1 + floor(random() * 40)::int);
    ok := public.ex_mk_num(p_org, 'math', 'प्रतिशत', 3, 6, 8, b || ' का ' || a || '% कितना है?', 'What is ' || a || '% of ' || b || '?', trim(to_char(b * a / 100.0, 'FM999990.##'), '.'), array[trim(to_char(b * a / 10.0, 'FM999990.##'), '.'), trim(to_char(b * a / 100.0 + 5, 'FM999990.##'), '.'), trim(to_char(b * (100 - a) / 100.0, 'FM999990.##'), '.'), (a + b)::text], b || ' × ' || a || ' ÷ 100 = ' || trim(to_char(b * a / 100.0, 'FM999990.##'), '.')); n := n + ok::int;
    a := 2 + floor(random() * 8)::int; x := 1 + floor(random() * 12)::int; b := floor(random() * 20)::int; c := a * x + b;
    ok := public.ex_mk_num(p_org, 'math', 'समीकरण', 4, 6, 8, a || 'x + ' || b || ' = ' || c || ' हो, तो x का मान क्या है?', 'If ' || a || 'x + ' || b || ' = ' || c || ', what is x?', x::text, array[(x + 1)::text, (x - 1)::text, (x + 2)::text, (c - b)::text], a || 'x = ' || c || ' − ' || b || ' = ' || (c - b) || ', x = ' || x); n := n + ok::int;
    a := 11 + floor(random() * 19)::int;
    ok := public.ex_mk_num(p_org, 'math', 'वर्ग', 5, 6, 8, a || ' का वर्ग कितना है?', 'What is the square of ' || a || '?', (a * a)::text, array[(a * a + a)::text, (a * a - a)::text, (a * 2)::text, ((a + 1) * (a + 1))::text], a || ' × ' || a || ' = ' || (a * a)); n := n + ok::int;

    -- ===== school maths, class 9–10 =====
    a := 12 + floor(random() * 28)::int;
    ok := public.ex_mk_num(p_org, 'math', 'वर्गमूल', 1, 9, 10, (a * a) || ' का वर्गमूल क्या है?', 'What is the square root of ' || (a * a) || '?', a::text, array[(a + 1)::text, (a - 1)::text, (a + 2)::text, (a * 2)::text], a || ' × ' || a || ' = ' || (a * a)); n := n + ok::int;
    a := 1 + floor(random() * 9)::int; b := 1 + floor(random() * 9)::int; -- roots a, b of x² − (a+b)x + ab
    ok := public.ex_mk_num(p_org, 'math', 'द्विघात समीकरण', 2, 9, 10, 'x² − ' || (a + b) || 'x + ' || (a * b) || ' = 0 के मूलों का योग क्या है?', 'What is the sum of the roots of x² − ' || (a + b) || 'x + ' || (a * b) || ' = 0?', (a + b)::text, array[(a * b)::text, (-(a + b))::text, (a + b + 1)::text, (a + b - 1)::text], 'मूलों का योग = −b/a = ' || (a + b)); n := n + ok::int;
    a := 1 + floor(random() * 20)::int; d := 2 + floor(random() * 8)::int; k := 10 + floor(random() * 20)::int;
    ok := public.ex_mk_num(p_org, 'math', 'समांतर श्रेढ़ी', 3, 9, 10, 'समांतर श्रेढ़ी ' || a || ', ' || (a + d) || ', ' || (a + 2 * d) || ', … का ' || k || 'वाँ पद क्या है?', 'What is the ' || k || 'th term of the AP ' || a || ', ' || (a + d) || ', ' || (a + 2 * d) || ', …?', (a + (k - 1) * d)::text, array[(a + k * d)::text, (a + (k - 2) * d)::text, (k * d)::text, (a + (k - 1) * d + 1)::text], 'aₙ = a + (n − 1)d = ' || a || ' + ' || (k - 1) || ' × ' || d || ' = ' || (a + (k - 1) * d)); n := n + ok::int;
    a := 1 + floor(random() * 25)::int; d := 1 + floor(random() * 6)::int; k := 5 + floor(random() * 16)::int;
    ok := public.ex_mk_num(p_org, 'math', 'समांतर श्रेढ़ी', 4, 9, 10, 'समांतर श्रेढ़ी ' || a || ', ' || (a + d) || ', ' || (a + 2 * d) || ', … के पहले ' || k || ' पदों का योग क्या है?', 'What is the sum of the first ' || k || ' terms of the AP ' || a || ', ' || (a + d) || ', ' || (a + 2 * d) || ', …?', (k * (2 * a + (k - 1) * d) / 2)::text, array[(k * (2 * a + k * d) / 2)::text, (k * (a + (k - 1) * d))::text, (k * (2 * a + (k - 1) * d) / 2 + d)::text, (k * a + d)::text], 'Sₙ = n/2 × [2a + (n − 1)d] = ' || (k * (2 * a + (k - 1) * d) / 2)); n := n + ok::int;
    a := 7 * (1 + floor(random() * 3)::int); b := 2 + floor(random() * 13)::int; -- cylinder volume, π = 22/7
    ok := public.ex_mk_num(p_org, 'math', 'क्षेत्रमिति', 5, 9, 10, 'एक बेलन की त्रिज्या ' || a || ' सेमी और ऊँचाई ' || b || ' सेमी है। उसका आयतन (π = 22/7) कितना है?', 'A cylinder has radius ' || a || ' cm and height ' || b || ' cm. What is its volume (π = 22/7)?', (22 * a * a * b / 7)::text, array[(22 * a * b * 2 / 7)::text, (22 * a * a * b / 7 * 2)::text, (22 * a * a / 7)::text, (22 * a * a * b / 21)::text], 'V = πr²h = 22/7 × ' || a || '² × ' || b || ' = ' || (22 * a * a * b / 7) || ' सेमी³', 'cm³', 'सेमी³'); n := n + ok::int;

    -- ===== school maths, class 11–12 =====
    a := 5 + floor(random() * 8)::int; b := 2 + floor(random() * 3)::int;
    c := (select round(exp(sum(ln(g))))::int from generate_series(a - b + 1, a) g) / (select round(exp(sum(ln(g))))::int from generate_series(1, b) g);
    ok := public.ex_mk_num(p_org, 'math', 'संचय', 1, 11, 12, a || 'C' || b || ' (' || a || ' वस्तुओं में से ' || b || ' चुनने के तरीके) का मान क्या है?', 'What is ' || a || 'C' || b || ' (ways to choose ' || b || ' of ' || a || ')?', c::text, array[(c * b)::text, (c + a)::text, (a * b)::text, (c - 1)::text], 'ⁿCᵣ = n! / (r!(n − r)!) = ' || c); n := n + ok::int;
    a := 2 + floor(random() * 5)::int; b := 1 + floor(random() * 4)::int; c := 1 + floor(random() * 5)::int;
    ok := public.ex_mk_num(p_org, 'math', 'अवकलन', 2, 11, 12, 'यदि f(x) = ' || c || 'x^' || a || ' तो f''(' || b || ') का मान क्या है?', 'If f(x) = ' || c || 'x^' || a || ', what is f''(' || b || ')?', (c * a * power(b, a - 1))::int::text, array[(c * power(b, a))::int::text, (c * a * power(b, a))::int::text, (a * power(b, a - 1))::int::text, (c * (a - 1) * power(b, a - 2))::int::text], 'f''(x) = ' || (c * a) || 'x^' || (a - 1) || ', इसलिए f''(' || b || ') = ' || (c * a * power(b, a - 1))::int); n := n + ok::int;
    a := 1 + floor(random() * 5)::int; b := 2 + floor(random() * 2)::int; k := 3 + floor(random() * 4)::int;
    ok := public.ex_mk_num(p_org, 'math', 'गुणोत्तर श्रेढ़ी', 3, 11, 12, 'गुणोत्तर श्रेढ़ी ' || a || ', ' || (a * b) || ', ' || (a * b * b) || ', … के पहले ' || k || ' पदों का योग क्या है?', 'What is the sum of the first ' || k || ' terms of the GP ' || a || ', ' || (a * b) || ', ' || (a * b * b) || ', …?', (a * (power(b, k) - 1) / (b - 1))::int::text, array[(a * power(b, k))::int::text, (a * (power(b, k + 1) - 1) / (b - 1))::int::text, (a * power(b, k - 1))::int::text, (a * (power(b, k) - 1) / (b - 1) + 1)::int::text], 'Sₙ = a(rⁿ − 1)/(r − 1)'); n := n + ok::int;
    a := 1 + floor(random() * 9)::int; b := 1 + floor(random() * 9)::int; c := 1 + floor(random() * 9)::int; d := 1 + floor(random() * 9)::int;
    ok := public.ex_mk_num(p_org, 'math', 'सारणिक', 4, 11, 12, 'सारणिक |' || a || ' ' || b || '; ' || c || ' ' || d || '| का मान क्या है?', 'What is the value of the determinant |' || a || ' ' || b || '; ' || c || ' ' || d || '|?', (a * d - b * c)::text, array[(a * d + b * c)::text, (b * c - a * d)::text, (a * b - c * d)::text, (a + d - b - c)::text], '|A| = ad − bc = ' || (a * d) || ' − ' || (b * c) || ' = ' || (a * d - b * c)); n := n + ok::int;
    a := (array[2, 3, 5, 10])[1 + floor(random() * 4)::int]; k := 2 + floor(random() * 4)::int;
    ok := public.ex_mk_num(p_org, 'math', 'लघुगणक', 5, 11, 12, 'log' || a || '(' || power(a, k)::bigint || ') का मान क्या है?', 'What is log base ' || a || ' of ' || power(a, k)::bigint || '?', k::text, array[(k + 1)::text, (k - 1)::text, (power(a, k)::bigint / a)::text, (k * 2)::text], a || '^' || k || ' = ' || power(a, k)::bigint); n := n + ok::int;

    -- ===== quantitative aptitude (government exams) =====
    a := 12 + floor(random() * 30)::int; b := 3 + floor(random() * 15)::int; c := 10 + floor(random() * 90)::int;
    ok := public.ex_mk_num(p_org, 'quant', 'सरलीकरण', 1, null, null, a || ' × ' || b || ' + ' || c || ' = ?', a || ' × ' || b || ' + ' || c || ' = ?', (a * b + c)::text, array[(a * (b + c))::text, (a * b - c)::text, (a * b + c + 10)::text, (a + b + c)::text], 'पहले गुणा, फिर जोड़: ' || (a * b) || ' + ' || c || ' = ' || (a * b + c)); n := n + ok::int;
    a := 100 * (2 + floor(random() * 20)::int); b := (array[5, 10, 12, 15, 20, 25])[1 + floor(random() * 6)::int];
    ok := public.ex_mk_num(p_org, 'quant', 'लाभ-हानि', 2, null, null, 'एक वस्तु ₹' || a || ' में खरीदकर ' || b || '% लाभ पर बेची गई। विक्रय मूल्य कितना है?', 'An article bought for ₹' || a || ' is sold at a profit of ' || b || '%. What is the selling price?', '₹' || (a * (100 + b) / 100), array['₹' || (a * (100 - b) / 100), '₹' || (a + b), '₹' || (a * (100 + 2 * b) / 100), '₹' || (a * b / 100)], 'विक्रय मूल्य = क्रय मूल्य × (100 + लाभ%)/100 = ' || a || ' × ' || (100 + b) || '/100 = ' || (a * (100 + b) / 100)); n := n + ok::int;
    arr := array(select 10 + floor(random() * 90)::int from generate_series(1, 5));
    s := array_to_string(arr, ', ');
    ok := public.ex_mk_num(p_org, 'quant', 'औसत', 2, null, null, s || ' का औसत क्या है?', 'What is the average of ' || s || '?', trim(to_char((select avg(v) from unnest(arr) v), 'FM99990.##'), '.'), array[trim(to_char((select avg(v) from unnest(arr) v) + 2, 'FM99990.##'), '.'), trim(to_char((select avg(v) from unnest(arr) v) - 1.5, 'FM99990.##'), '.'), (select sum(v) from unnest(arr) v)::text, trim(to_char((select avg(v) from unnest(arr) v) + 3.4, 'FM99990.##'), '.')], 'योग ÷ संख्या = ' || (select sum(v) from unnest(arr) v) || ' ÷ 5'); n := n + ok::int;
    a := 1000 * (1 + floor(random() * 20)::int); b := 2 + floor(random() * 10)::int; c := 2 + floor(random() * 5)::int;
    ok := public.ex_mk_num(p_org, 'quant', 'साधारण ब्याज', 3, null, null, '₹' || a || ' पर ' || b || '% वार्षिक दर से ' || c || ' वर्ष का साधारण ब्याज कितना होगा?', 'What is the simple interest on ₹' || a || ' at ' || b || '% per annum for ' || c || ' years?', '₹' || (a * b * c / 100), array['₹' || (a * b / 100), '₹' || (a * b * c / 100 + a), '₹' || (a * b * (c + 1) / 100), '₹' || (a * (b + 1) * c / 100)], 'साधारण ब्याज = मूलधन × दर × समय / 100 = ' || (a * b * c / 100)); n := n + ok::int;
    a := 2 + floor(random() * 7)::int; b := 1 + floor(random() * 7)::int; c := (a + b) * (10 * (1 + floor(random() * 30)::int));
    if a <> b then
      ok := public.ex_mk_num(p_org, 'quant', 'अनुपात', 3, null, null, '₹' || c || ' को ' || a || ':' || b || ' के अनुपात में बाँटने पर बड़ा भाग कितना होगा?', 'If ₹' || c || ' is divided in the ratio ' || a || ':' || b || ', what is the larger share?', '₹' || (c * greatest(a, b) / (a + b)), array['₹' || (c * least(a, b) / (a + b)), '₹' || (c / 2), '₹' || (c * greatest(a, b) / (a + b) + 10), '₹' || (c - c / (a + b))], 'बड़ा भाग = ' || c || ' × ' || greatest(a, b) || '/' || (a + b)); n := n + ok::int;
    end if;
    a := 10 * (3 + floor(random() * 10)::int); b := 2 + floor(random() * 6)::int;
    ok := public.ex_mk_num(p_org, 'quant', 'चाल-समय-दूरी', 4, null, null, 'एक गाड़ी ' || a || ' किमी/घंटा की चाल से ' || b || ' घंटे में कितनी दूरी तय करेगी?', 'How far does a vehicle travel in ' || b || ' hours at ' || a || ' km/h?', (a * b)::text, array[(a + b)::text, (a * (b + 1))::text, (a * b / 2)::text, (a * b + 10)::text], 'दूरी = चाल × समय = ' || a || ' × ' || b || ' = ' || (a * b), 'km', 'किमी'); n := n + ok::int;
    a := (array[4, 6, 8, 10, 12, 15, 20])[1 + floor(random() * 7)::int]; b := (array[6, 12, 15, 20, 24, 30, 60])[1 + floor(random() * 7)::int];
    if a <> b and (a * b) % (a + b) = 0 then
      ok := public.ex_mk_num(p_org, 'quant', 'समय और कार्य', 4, null, null, 'A किसी काम को ' || a || ' दिन में और B ' || b || ' दिन में करता है। दोनों मिलकर कितने दिन में करेंगे?', 'A can do a job in ' || a || ' days and B in ' || b || ' days. In how many days can they do it together?', ((a * b) / (a + b))::text, array[((a + b) / 2)::text, (a + b)::text, (((a * b) / (a + b)) + 2)::text, (abs(a - b))::text], 'साथ में = ab/(a + b) = ' || (a * b) || '/' || (a + b), 'days', 'दिन'); n := n + ok::int;
    end if;
    a := 100 * (10 + floor(random() * 90)::int); b := (array[10, 20])[1 + floor(random() * 2)::int];
    ok := public.ex_mk_num(p_org, 'quant', 'चक्रवृद्धि ब्याज', 5, null, null, '₹' || a || ' पर ' || b || '% वार्षिक चक्रवृद्धि ब्याज से 2 वर्ष का ब्याज कितना होगा?', 'What is the compound interest on ₹' || a || ' at ' || b || '% per annum for 2 years?', '₹' || trim(to_char(a * ((1 + b / 100.0) ^ 2 - 1), 'FM99999990.##'), '.'), array['₹' || (a * b * 2 / 100), '₹' || trim(to_char(a * ((1 + b / 100.0) ^ 2), 'FM99999990.##'), '.'), '₹' || trim(to_char(a * ((1 + b / 100.0) ^ 2 - 1) + a * b / 100.0, 'FM99999990.##'), '.'), '₹' || (a * b / 100)], 'चक्रवृद्धि ब्याज = मूलधन × [(1 + दर/100)² − 1]'); n := n + ok::int;
    a := 100 + 10 * floor(random() * 30)::int; b := 36 + 18 * floor(random() * 4)::int; -- speed km/h divisible by 18
    ok := public.ex_mk_num(p_org, 'quant', 'रेलगाड़ी', 5, null, null, a || ' मीटर लंबी रेलगाड़ी ' || b || ' किमी/घंटा की चाल से एक खंभे को कितने सेकंड में पार करेगी?', 'In how many seconds will a ' || a || ' m long train running at ' || b || ' km/h cross a pole?', trim(to_char(a / (b * 5 / 18.0), 'FM9990.##'), '.'), array[trim(to_char(a / (b * 5 / 18.0) + 2, 'FM9990.##'), '.'), trim(to_char(a / (b * 1.0), 'FM9990.##'), '.'), trim(to_char(a / (b * 5 / 18.0) * 2, 'FM9990.##'), '.'), trim(to_char(a * 18 / (b * 1.0) / 2, 'FM9990.##'), '.')], 'चाल = ' || b || ' × 5/18 = ' || (b * 5 / 18) || ' मी/से; समय = ' || a || ' ÷ ' || (b * 5 / 18), 's', 'सेकंड'); n := n + ok::int;

    -- ===== reasoning =====
    a := 1 + floor(random() * 20)::int; d := 2 + floor(random() * 9)::int;
    ok := public.ex_mk_num(p_org, 'reasoning', 'संख्या श्रृंखला', 1, null, null, 'श्रृंखला पूरी करें: ' || a || ', ' || (a + d) || ', ' || (a + 2 * d) || ', ' || (a + 3 * d) || ', ?', 'Complete the series: ' || a || ', ' || (a + d) || ', ' || (a + 2 * d) || ', ' || (a + 3 * d) || ', ?', (a + 4 * d)::text, array[(a + 4 * d + 1)::text, (a + 5 * d)::text, (a + 4 * d - 2)::text, (a + 3 * d + 1)::text], 'हर बार ' || d || ' जुड़ रहा है'); n := n + ok::int;
    a := 1 + floor(random() * 5)::int; b := 2 + floor(random() * 2)::int;
    ok := public.ex_mk_num(p_org, 'reasoning', 'संख्या श्रृंखला', 2, null, null, 'श्रृंखला पूरी करें: ' || a || ', ' || (a * b) || ', ' || (a * b * b) || ', ' || (a * b * b * b) || ', ?', 'Complete the series: ' || a || ', ' || (a * b) || ', ' || (a * b * b) || ', ' || (a * b * b * b) || ', ?', (a * b * b * b * b)::text, array[(a * b * b * b + b)::text, (a * b * b * b * 2 + 1)::text, (a * b * b * b + a * b * b)::text, (a * b * b * b * b + b)::text], 'हर पद पिछले का ' || b || ' गुना'); n := n + ok::int;
    a := 1 + floor(random() * 20)::int; k := 1 + floor(random() * 4)::int;
    s := ''; t := '';
    for d in 0 .. 3 loop s := s || substr(alpha, ((a - 1 + d * k) % 26) + 1, 1) || ', '; end loop;
    ok := public.ex_mk_num(p_org, 'reasoning', 'अक्षर श्रृंखला', 3, null, null, 'श्रृंखला पूरी करें: ' || s || '?', 'Complete the series: ' || s || '?', substr(alpha, ((a - 1 + 4 * k) % 26) + 1, 1), array[substr(alpha, ((a + 4 * k) % 26) + 1, 1), substr(alpha, ((a - 2 + 4 * k) % 26) + 1, 1), substr(alpha, ((a - 1 + 5 * k) % 26) + 1, 1), substr(alpha, ((a + 1 + 4 * k) % 26) + 1, 1)], 'हर बार ' || k || ' अक्षर आगे'); n := n + ok::int;
    s := (array['CAT', 'DOG', 'SUN', 'PEN', 'BOOK', 'TREE', 'RAIN', 'FISH', 'MILK', 'STAR', 'ROSE', 'BIRD', 'LAMP', 'GOLD', 'HILL', 'KING'])[1 + floor(random() * 16)::int];
    k := 1 + floor(random() * 3)::int; t := (array['MANGO', 'TIGER', 'WATER', 'HOUSE', 'PLANT', 'RIVER', 'CHAIR', 'LIGHT', 'BREAD', 'CLOUD'])[1 + floor(random() * 10)::int];
    ok := public.ex_mk_num(p_org, 'reasoning', 'कूट-लेखन', 3, null, null, 'यदि किसी कूट भाषा में ' || s || ' को ' || public.ex_shift(s, k) || ' लिखा जाता है, तो ' || t || ' को कैसे लिखा जाएगा?', 'In a code language ' || s || ' is written as ' || public.ex_shift(s, k) || '. How is ' || t || ' written?', public.ex_shift(t, k), array[public.ex_shift(t, k + 1), public.ex_shift(t, k - 1), public.ex_shift(reverse(t), k), public.ex_shift(t, -k)], 'हर अक्षर ' || k || ' स्थान आगे'); n := n + ok::int;
    dt := date '2000-01-01' + floor(random() * 10000)::int;
    ok := public.ex_mk_num(p_org, 'reasoning', 'कैलेंडर', 4, null, null, to_char(dt, 'DD-MM-YYYY') || ' को सप्ताह का कौन-सा दिन था?', 'Which day of the week was ' || to_char(dt, 'DD-MM-YYYY') || '?',
      days_en[extract(dow from dt)::int + 1],
      array[days_en[((extract(dow from dt)::int + 1) % 7) + 1], days_en[((extract(dow from dt)::int + 2) % 7) + 1], days_en[((extract(dow from dt)::int + 6) % 7) + 1], days_en[((extract(dow from dt)::int + 4) % 7) + 1]],
      'विषम दिनों की गणना से', '', '', days_hi[extract(dow from dt)::int + 1],
      array[days_hi[((extract(dow from dt)::int + 1) % 7) + 1], days_hi[((extract(dow from dt)::int + 2) % 7) + 1], days_hi[((extract(dow from dt)::int + 6) % 7) + 1], days_hi[((extract(dow from dt)::int + 4) % 7) + 1]]); n := n + ok::int;
    a := 1 + floor(random() * 12)::int; b := 5 * floor(random() * 12)::int;
    c := abs((30 * a - 11 * b / 2.0)::numeric)::int % 360; if c > 180 then c := 360 - c; end if;
    if (30 * a - 11 * b / 2.0) = floor(30 * a - 11 * b / 2.0) then
      ok := public.ex_mk_num(p_org, 'reasoning', 'घड़ी', 4, null, null, a || ':' || lpad(b::text, 2, '0') || ' बजे घंटे और मिनट की सुइयों के बीच का (छोटा) कोण कितना है?', 'What is the smaller angle between the hands of a clock at ' || a || ':' || lpad(b::text, 2, '0') || '?', c || '°', array[((c + 30) % 181) || '°', abs(c - 15) || '°', (360 - c) || '°', ((c + 60) % 181) || '°'], 'कोण = |30H − 11M/2|'); n := n + ok::int;
    end if;
    a := 1 + floor(random() * 6)::int; b := 2 + floor(random() * 4)::int; c := 1 + floor(random() * 5)::int;
    ok := public.ex_mk_num(p_org, 'reasoning', 'संख्या श्रृंखला', 5, null, null, 'श्रृंखला पूरी करें: ' || a || ', ' || (a + c) || ', ' || ((a + c) * b) || ', ' || ((a + c) * b + c) || ', ' || (((a + c) * b + c) * b) || ', ?', 'Complete the series: ' || a || ', ' || (a + c) || ', ' || ((a + c) * b) || ', ' || ((a + c) * b + c) || ', ' || (((a + c) * b + c) * b) || ', ?', ((((a + c) * b + c) * b) + c)::text, array[((((a + c) * b + c) * b) * b)::text, ((((a + c) * b + c) * b) + c + 1)::text, ((((a + c) * b + c) * b) - c)::text, ((((a + c) * b + c) * b) + b)::text], 'बारी-बारी से +' || c || ' और ×' || b); n := n + ok::int;
    a := (array[2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47])[1 + floor(random() * 15)::int];
    arr := array(select v from unnest(array[4, 6, 8, 9, 10, 12, 14, 15, 16, 18, 20, 21, 22, 25, 27, 33, 35, 49]) v order by random() limit 3);
    ok := public.ex_mk_num(p_org, 'reasoning', 'विषम चुनें', 2, null, null, 'इनमें कौन-सी संख्या अभाज्य है?', 'Which of these is a prime number?', a::text, array[arr[1]::text, arr[2]::text, arr[3]::text], a || ' का 1 और स्वयं के अलावा कोई गुणनखंड नहीं'); n := n + ok::int;
  end loop;
  return n;
end $$;
revoke execute on function public.ex_gen_computed(uuid, int) from public, anon;
grant execute on function public.ex_gen_computed(uuid, int) to authenticated;

-- Caesar shift for coding-decoding questions
create or replace function public.ex_shift(p text, k int)
returns text language sql immutable as $$
  select string_agg(case when c ~ '[A-Z]' then chr(65 + (((ascii(c) - 65 + k) % 26) + 26) % 26) else c end, '' order by i)
    from unnest(string_to_array(p, null)) with ordinality u(c, i);
$$;
