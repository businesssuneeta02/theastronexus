import {createClient} from '@supabase/supabase-js';

export const supabase=createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL||'https://llwfhmitrieuanpunlqy.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||'sb_publishable_fr86EmXj1mzMpEseMSfJ0Q_VJlsSCmP'
);
