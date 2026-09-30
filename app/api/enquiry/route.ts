import {NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';

const TO_EMAIL=process.env.ENQUIRY_NOTIFICATION_EMAIL||'sushant.bhushan31@gmail.com';

function adminClient(){const key=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;if(!key)throw new Error('Server admin key is not configured.');return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,key,{auth:{autoRefreshToken:false,persistSession:false}})}

export async function POST(request:Request){
  try{
    const {name,email,phone,service,message}=await request.json();
    const emailOk=typeof email==='string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    const phoneOk=typeof phone==='string' && /^[+0-9][0-9 ()-]{7,18}$/.test(phone.trim());
    if(!name||!message||!emailOk||!phoneOk) return NextResponse.json({error:'Please provide a valid name, email address, phone number and message.'},{status:400});
    const sb=adminClient();
    const {error:dbError}=await sb.from('enquiries').insert({name:String(name).trim(),email:String(email).trim(),phone:String(phone).trim(),service:String(service||'').trim(),message:String(message).trim()});
    if(dbError) return NextResponse.json({error:'Unable to save your enquiry. Please try again.'},{status:500});

    const apiKey=process.env.RESEND_API_KEY;
    const from=process.env.RESEND_FROM_EMAIL;
    if(!apiKey||!from) return NextResponse.json({error:'Email notification is not configured yet.'},{status:503});

    const safe=(value:string)=>String(value||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    const subject='New TheAstroNexus Website Enquiry';
    const html=`<div style="font-family:Arial,sans-serif;line-height:1.6"><h2>New website enquiry</h2><p><b>Name:</b> ${safe(name)}</p><p><b>Email:</b> ${safe(email||'Not provided')}</p><p><b>Phone / WhatsApp:</b> ${safe(phone||'Not provided')}</p><p><b>Service / Course:</b> ${safe(service||'Not specified')}</p><p><b>Message:</b><br/>${safe(message).replace(/\n/g,'<br/>')}</p><hr/><p style="color:#666;font-size:12px">Submitted through TheAstroNexus website.</p></div>`;

    const response=await fetch('https://api.resend.com/emails',{
      method:'POST',
      headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},
      body:JSON.stringify({from,to:[TO_EMAIL],reply_to:email||undefined,subject,html})
    });
    const result=await response.json();
    if(!response.ok) return NextResponse.json({error:result?.message||'Unable to send email notification.'},{status:502});
    return NextResponse.json({ok:true});
  }catch{
    return NextResponse.json({error:'Unable to send email notification.'},{status:500});
  }
}
