DELETE FROM public.benchmarks
WHERE school_code = 'HUST'
  AND method_code IN ('XTTN11', 'XTTN12');

DELETE FROM public.program_combinations
WHERE method_code IN ('XTTN11', 'XTTN12')
  AND program_id IN (
    SELECT id
    FROM public.admission_programs
    WHERE school_code = 'HUST'
  );

DELETE FROM public.admission_methods
WHERE school_code = 'HUST'
  AND method_code IN ('XTTN11', 'XTTN12');
