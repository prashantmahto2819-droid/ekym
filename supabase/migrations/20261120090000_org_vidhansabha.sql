-- सदस्यता में विधानसभा क्षेत्र (वैकल्पिक; सूची public.assembly_constituencies से, लेबल "नाम (ज़िला, राज्य)")
alter table public.org_memberships add column if not exists vidhansabha text check (vidhansabha is null or char_length(vidhansabha) <= 160);
