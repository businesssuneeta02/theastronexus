import {createClient} from '@supabase/supabase-js';

// Development intentionally uses the Production Supabase project.
// This prevents stale Vercel Preview variables from pointing to the deleted test project.
const url='https://llwfhmitrieuanpunlqy.supabase.co';
const key='sb_publishable_fr86EmXj1mzMpEseMSfJ0Q_VJlsSCmP';

export const supabase=createClient(url,key);
