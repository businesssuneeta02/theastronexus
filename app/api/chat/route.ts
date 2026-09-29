import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    if (!Array.isArray(messages) || !messages.length) return NextResponse.json({ error: 'Invalid messages.' }, { status: 400 });

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    );

    const [settings, services, courses, faqs] = await Promise.all([
      supabase.from('site_settings').select('*').single(),
      supabase.from('services').select('name,short_description,detailed_description,duration,price_inr,booking_url').eq('is_active', true).order('sort_order'),
      supabase.from('courses').select('name,description,duration,price_inr,booking_url').eq('is_active', true).order('sort_order'),
      supabase.from('chatbot_faqs').select('question,answer,keywords').eq('is_active', true).order('sort_order')
    ]);

    const lastUser = String(messages[messages.length - 1]?.content || '');
    const queryTokens = new Set(normalize(lastUser));
    const business = settings.data || {};
    const activeServices = services.data || [];
    const activeCourses = courses.data || [];
    const activeFaqs = faqs.data || [];

    const wa = business.whatsapp_url || '';

    // 1) Exact/keyword matches from Admin-managed FAQ knowledge.
    let bestFaq: any = null;
    let bestFaqScore = 0;
    for (const faq of activeFaqs) {
      const haystack = normalize([faq.question, faq.keywords || ''].join(' '));
      const score = haystack.reduce((n: number, token: string) => n + (queryTokens.has(token) && token.length > 2 ? 1 : 0), 0);
      if (score > bestFaqScore) {
        bestFaqScore = score;
        bestFaq = faq;
      }
    }
    if (bestFaq && bestFaqScore >= 1) {
      return NextResponse.json({ reply: bestFaq.answer, needsWhatsApp: false });
    }

    const q = lastUser.toLowerCase();

    // 2) Deterministic answers from current Admin-managed services/courses/settings.
    if (/(price|pricing|cost|fee|charge|how much)/.test(q)) {
      const serviceText = activeServices.map((s: any) => `${s.name} — ₹${s.price_inr ?? 'on request'}${s.duration ? `, ${s.duration}` : ''}`).join('; ');
      const courseText = activeCourses.map((c: any) => `${c.name} — ₹${c.price_inr ?? 'on request'}${c.duration ? `, ${c.duration}` : ''}`).join('; ');
      return NextResponse.json({ reply: [serviceText && `Services: ${serviceText}.`, courseText && `Courses: ${courseText}.`].filter(Boolean).join(' ') || 'Current pricing is available from our team on WhatsApp.', needsWhatsApp: !serviceText && !courseText });
    }

    if (/(course|learn|training|class|workshop)/.test(q) && activeCourses.length) {
      return NextResponse.json({
        reply: `Our current courses are: ${activeCourses.map((c: any) => `${c.name}${c.description ? ` — ${c.description}` : ''}${c.price_inr != null ? ` (₹${c.price_inr})` : ''}`).join('; ')}.`,
        needsWhatsApp: false
      });
    }

    if (/(service|consult|appointment|book|booking)/.test(q) && activeServices.length) {
      return NextResponse.json({
        reply: `Our current services are: ${activeServices.map((s: any) => `${s.name}${s.price_inr != null ? ` — ₹${s.price_inr}` : ''}`).join('; ')}. Select a service on the website to see its details and booking option.`,
        needsWhatsApp: false
      });
    }

    if (/(who|about|business|theastronexus|astrology)/.test(q) && business.introduction) {
      return NextResponse.json({ reply: business.introduction, needsWhatsApp: false });
    }

    if (/(contact|phone|email|reach|whatsapp)/.test(q)) {
      const contact = [business.contact_phone && `Phone: ${business.contact_phone}`, business.contact_email && `Email: ${business.contact_email}`].filter(Boolean).join(' · ');
      return NextResponse.json({ reply: contact || 'Please contact our team directly on WhatsApp.', needsWhatsApp: !contact });
    }

    // 3) No approved website answer: route to WhatsApp instead of guessing.
    return NextResponse.json({
      reply: 'I couldn’t find that information in the website knowledge provided by the admin. Please contact the TheAstroNexus team directly on WhatsApp.',
      needsWhatsApp: true,
      whatsappUrl: wa
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Chatbot error.', needsWhatsApp: true }, { status: 500 });
  }
}
