import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'Chatbot is not configured yet.' }, { status: 503 });
    }

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