DELETE FROM public.blogs WHERE title LIKE 'QA Test%';
DELETE FROM public.news WHERE title LIKE 'QA Test%';
DELETE FROM public.campaigns WHERE title LIKE 'QA Test%';
DELETE FROM public.books WHERE title LIKE 'QA Test%';
DELETE FROM public.seva_projects WHERE name LIKE 'QA Test%';
DELETE FROM public.homepage_sections WHERE section_key = 'qa_test';
DELETE FROM public.contributors WHERE name LIKE 'QA Test%';
DELETE FROM public.videos WHERE title LIKE 'QA Test%';