DELETE FROM public.material_donation_requests WHERE donor_name LIKE 'QA%';
DELETE FROM public.book_donation_requests WHERE donor_name LIKE 'QA%';
DELETE FROM public.intern_applications WHERE name LIKE 'QA%';
DELETE FROM public.volunteer_applications WHERE name LIKE 'QA%';
DELETE FROM public.blood_requirements WHERE patient_name LIKE 'QA%';
DELETE FROM public.blood_donors WHERE full_name LIKE 'QA%';
DELETE FROM public.contact_messages WHERE name LIKE 'QA%';