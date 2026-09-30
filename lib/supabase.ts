import {createClient} from '@supabase/supabase-js';

const url=process.env.NEXT_PUBLIC_SUPABASE_URL||'https://llwfhmitrieuanpunlqy.supabase.co';
const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||'sb_publishable_fr86EmXj1mzMpEseMSfJ0Q_VJlsSCmP';

export const supabase=createClient(url,key);