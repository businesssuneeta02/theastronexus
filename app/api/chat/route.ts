import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    if (!Array.isArray(messages)) return NextResponse.json({ error: 'Invalid messages.' }, { status: 400 });

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    );

    const [settings, services, courses] = await Promise.all([
      supabase.from('site_settings').select('*').single(),
      supabase.from('services').select('name,short_description,detailed_description,duration,price_inr').eq('is_active', true).order('sort_order'),
      supabase.from('courses').select('name,description,duration,price_inr').eq('is_active', true).order('sort_order')
    ]);

    const context = JSON.stringify({
      business: settings.data || {},
      services: services.data || [],
      courses: courses.data || []
    });

    if (!process.env.OPENAI_API_KEY) {
      const lastUser = String(messages[messages.length - 1]?.content || '').toLowerCase();
      const serviceText = (services.data || []).map((s: any) => `${s.name} — ₹${s.price_inr}, ${s.duration || 'duration on request'}`).join('; ');
      const courseText = (courses.data || []).map((c: any) => `${c.name} — ₹${c.price_inr}, ${c.duration || 'duration on request'}`).join('; ');
      let reply = 'I can help with TheAstroNexus services, courses, pricing and bookings. ';
      if (/(price|pricing|cost|fee|charge|how much)/.test(lastUser)) {
        reply += serviceText ? `Our current services are: ${serviceText}.` : 'Please contact our team for current service pricing.';
      } else if (/(course|learn|training|class)/.test(lastUser)) {
        reply += courseText ? `Our current courses are: ${courseText}.` : 'Please contact our team for current course details.';
      } else if (/(service|consult|booking|book|appointment)/.test(lastUser)) {
        reply += serviceText ? `Our current services are: ${serviceText}. You can choose a service from the Services section to book and pay.` : 'Please use the Services section or contact our team.';
      } else if (/(who|about|theastronexus|astrology)/.test(lastUser)) {
        reply += String(settings.data?.introduction || 'We provide astrology consultations and education.') + ' You can ask me about our services, courses, pricing or booking.';
      } else {
        reply += 'Ask me about our services, courses, pricing, bookings, or how to contact the team.';
      }
      return NextResponse.json({ reply });
    }

    const system = `You are the friendly website assistant for TheAstroNexus, an astrology consultation and education business in India.

Answer generic visitor questions using the business information below. Be concise, warm and helpful. You may explain what each listed service/course is, prices, durations, how to contact the business, how booking/payment works, and general website questions.

Do not invent prices, services, guarantees, qualifications, appointment availability, personal predictions, medical advice, legal advice, financial guarantees, or facts that are not in the supplied business information. For personalised astrology readings, explain that the visitor should book a consultation rather than pretending to perform a complete professional reading in chat.

If the visitor asks to speak to a person, asks for WhatsApp, wants to book through WhatsApp, has a complaint, needs a custom request, or the question cannot be answered confidently from the supplied information, say that you can hand them over to the TheAstroNexus team on WhatsApp.

Business information:
${context}`;

    const input = messages.slice(-12).map((m: any) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: String(m.content || '')
    }));

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: process.env.OPENAI_CHAT_MODEL || 'gpt-5.6-luna',
        instructions: system,
        input,
        max_output_tokens: 500
      })
    });

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json({ error: data?.error?.message || 'Unable to get a chatbot response.' }, { status: 500 });
    }

    return NextResponse.json({ reply: data.output_text || 'I can help with services, courses and bookings. Would you like to continue on WhatsApp?' });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Chatbot error.' }, { status: 500 });
  }
}