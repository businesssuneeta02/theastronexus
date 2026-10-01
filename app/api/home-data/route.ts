import {NextResponse} from 'next/server';
import {supabase} from '../../../lib/supabase';

export const dynamic='force-dynamic';
export const revalidate=0;

export async function GET(){
  const [st,s,o,t,c,h,g]=await Promise.all([
    supabase.from('site_settings').select('*').single(),
    supabase.from('services').select('*').eq('is_active',true).order('sort_order'),
    supabase.from('co_owners').select('*').order('sort_order'),
    supabase.from('testimonials').select('*').eq('is_published',true),
    supabase.from('courses').select('*').eq('is_active',true).order('sort_order'),
    supabase.from('daily_horoscopes').select('*').eq('horoscope_date',new Date().toISOString().slice(0,10)),
    supabase.from('gallery').select('*').eq('is_published',true).order('sort_order')
  ]);
  return NextResponse.json({
    settings:st.data||{},services:s.data||[],owners:o.data||[],testimonials:t.data||[],
    courses:c.data||[],horoscopes:h.data||[],gallery:g.data||[]
  },{headers:{'Cache-Control':'no-store, max-age=0, must-revalidate'}});
}
