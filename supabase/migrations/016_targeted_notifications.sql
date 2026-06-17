-- ============================================================
-- 016_targeted_notifications.sql
-- Adds support for direct-to-student notifications and
-- automates homework grading notifications.
-- ============================================================

-- 1. Add target_user_id to notifications to allow direct targeted messaging
ALTER TABLE public.notifications
ADD COLUMN IF NOT EXISTS target_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 2. Create the automation function for homework grading
CREATE OR REPLACE FUNCTION public.handle_homework_graded()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_hw_title TEXT;
BEGIN
  -- Only fire if the grade or feedback actually changed, and isn't empty
  IF (NEW.grade IS DISTINCT FROM OLD.grade AND NULLIF(TRIM(NEW.grade), '') IS NOT NULL) OR 
     (NEW.feedback IS DISTINCT FROM OLD.feedback AND NULLIF(TRIM(NEW.feedback), '') IS NOT NULL) THEN

     -- Fetch the title of the homework
     SELECT title INTO v_hw_title FROM public.homework WHERE id = NEW.homework_id;

     -- Insert the personalized notification into the architecture
     INSERT INTO public.notifications (
       title,
       body,
       type,
       target_user_id,
       target_role
     ) VALUES (
       'Homework Graded: ' || COALESCE(v_hw_title, 'Submission'),
       'Your teacher has provided feedback or a grade for your submission. Grade: ' || COALESCE(NEW.grade, 'Check feedback'),
       'homework',
       NEW.student_id, -- Directly targeting the specific student
       'student'
     );
  END IF;
  
  RETURN NEW;
END;
$$;

-- 3. Attach the trigger to the homework_submissions table
DROP TRIGGER IF EXISTS on_homework_graded ON public.homework_submissions;
CREATE TRIGGER on_homework_graded
  AFTER UPDATE ON public.homework_submissions
  FOR EACH ROW EXECUTE FUNCTION public.handle_homework_graded();