-- परिवार का गोत्र और कुलदेवी / कुलदेवता (वैकल्पिक; परिवार के पेज और छपे वंश वृक्ष पर दिखते हैं)
alter table public.families add column if not exists gotra text check (gotra is null or char_length(gotra) <= 80);
alter table public.families add column if not exists kuldevi text check (kuldevi is null or char_length(kuldevi) <= 120);
