import {NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';

function adminClient(){
  const key=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!key) throw new Error('Server admin key is not configured.');
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,key,{auth:{autoRefreshToken:false,persistSession:false}});
}
async function sendAuthEmail(sb:any,email:string,redirectTo:string,subject:string,headline:string,description:string){
  const key=process.env.RESEND_API_KEY;
  const from=process.env.RESEND_FROM_EMAIL;
  if(!key||!from) throw new Error('Resend is not configured on the server. Set RESEND_API_KEY and RESEND_FROM_EMAIL.');
  const generated=await sb.auth.admin.generateLink({type:'invite',email,options:{redirectTo}});
  if(generated.error) throw generated.error;
  const link=generated.data?.properties?.action_link;
  if(!link) throw new Error('Supabase did not return an invitation link.');
  const text=description+'\n\nAccept your invitation: '+link+'\n\nIf you did not expect this invitation, you can ignore this email.'; const html='<!doctype html><html><body style="margin:0;background:#f6f3ed;padding:32px 16px;font-family:Arial,sans-serif;color:#171717"><div style="max-width:600px;margin:0 auto;background:#fff;border:1px solid #e8e2d8;border-radius:14px;padding:32px"><div style="font-size:12px;letter-spacing:2px;font-weight:700">THEASTRONEXUS</div><h2 style="margin:18px 0 10px;font-size:24px">'+headline+'</h2><p style="font-size:16px;line-height:1.6">'+description+'</p><p><a href="'+link+'" style="display:inline-block;padding:13px 22px;background:#171717;color:#fff;text-decoration:none;border-radius:8px;font-weight:700">Accept invitation</a></p><p style="font-size:13px;line-height:1.6;color:#666">If the button does not work, copy and paste this link into your browser:</p><p style="font-size:12px;line-height:1.5;word-break:break-all"><a href="'+link+'">'+link+'</a></p><p style="font-size:12px;color:#888">If you did not expect this invitation, you can ignore this email.</p></div></body></html>'; const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({from,to:[email],reply_to:from,subject,html,text})});
  if(!response.ok){const detail=await response.text();throw new Error('Resend rejected the email: '+detail);}
}
async function authorize(request:Request){
  const auth=request.headers.get('authorization');
  if(!auth?.startsWith('Bearer ')) return null;
  const sb=adminClient();
  const {data:{user},error}=await sb.auth.getUser(auth.slice(7));
  if(error||!user)return null;
  const {data:row,error:adminError}=await sb.from('admin_users').select('user_id').eq('user_id',user.id).maybeSingle();
  if(adminError||!row)return null;
  return user;
}
export async function GET(request:Request){
  try{
    const user=await authorize(request);if(!user)return NextResponse.json({error:'Admin access required.'},{status:403});
    const sb=adminClient();
    const {data:admins,error}=await sb.from('admin_users').select('user_id,created_at').order('created_at');
    if(error)throw error;
    const users=await sb.auth.admin.listUsers({page:1,perPage:1000});if(users.error)throw users.error;
    const result=(admins||[]).map(a=>{const u=users.data.users.find(x=>x.id===a.user_id);return {user_id:a.user_id,email:u?.email||'Unknown',created_at:a.created_at,confirmed_at:u?.email_confirmed_at||null,last_sign_in_at:u?.last_sign_in_at||null}});
    return NextResponse.json({admins:result});
  }catch(e:any){return NextResponse.json({error:e?.message||'Unable to load admins.'},{status:500})}
}
export async function POST(request:Request){
  try{
    const user=await authorize(request);if(!user)return NextResponse.json({error:'Admin access required.'},{status:403});
    const body=await request.json();const email=String(body.email||'').trim().toLowerCase();
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return NextResponse.json({error:'Enter a valid email address.'},{status:400});
    const sb=adminClient();
    const users=await sb.auth.admin.listUsers({page:1,perPage:1000});if(users.error)throw users.error;
    let target=users.data.users.find(u=>u.email?.toLowerCase()===email);
    let invited=false;
    const redirectTo=`${new URL(request.url).origin}/admin8000`;
    if(!target){const invitedResult=await sb.auth.admin.inviteUserByEmail(email,{redirectTo});if(invitedResult.error)throw invitedResult.error;target=invitedResult.data.user;invited=true;}
    const {error}=await sb.from('admin_users').upsert({user_id:target.id},{onConflict:'user_id'});if(error)throw error;
    if(target?.email)await sendAuthEmail(sb,target.email,redirectTo,"You're invited to TheAstroNexus Admin",'You have been invited as an administrator','Use the button below to activate your administrator account.');
    return NextResponse.json({ok:true,message:invited?'Invitation sent and admin access added.':'Admin access added.'});
  }catch(e:any){return NextResponse.json({error:e?.message||'Unable to add admin.'},{status:500})}
}
export async function PATCH(request:Request){
  try{
    const user=await authorize(request);if(!user)return NextResponse.json({error:'Admin access required.'},{status:403});
    const body=await request.json();const user_id=String(body.user_id||'').trim();
    if(!user_id)return NextResponse.json({error:'Missing admin user.'},{status:400});
    const sb=adminClient();
    const {data:admin,error:adminError}=await sb.from('admin_users').select('user_id').eq('user_id',user_id).maybeSingle();
    if(adminError)throw adminError;
    if(!admin)return NextResponse.json({error:'This user does not have admin access.'},{status:404});
    const {data:target,error:targetError}=await sb.auth.admin.getUserById(user_id);
    if(targetError)throw targetError;
    if(!target.user?.email)return NextResponse.json({error:'Unable to find the admin email address.'},{status:404});
    const redirectTo=`${new URL(request.url).origin}/admin8000`;
    await sendAuthEmail(sb,target.user.email,redirectTo,'TheAstroNexus administrator invitation','You have been invited as an administrator','Use the button below to accept your TheAstroNexus administrator invitation.');
    return NextResponse.json({ok:true,message:`Invitation resent to ${target.user.email}.`});
  }catch(e:any){return NextResponse.json({error:e?.message||'Unable to resend invitation.'},{status:500})}
}
export async function DELETE(request:Request){
  try{
    const user=await authorize(request);if(!user)return NextResponse.json({error:'Admin access required.'},{status:403});
    const {user_id,delete_user}=await request.json();if(!user_id)return NextResponse.json({error:'Missing admin user.'},{status:400});
    const sb=adminClient();
    const {count}=await sb.from('admin_users').select('user_id',{count:'exact',head:true});if((count||0)<=1)return NextResponse.json({error:'The last admin cannot be removed.'},{status:400});
    if(user_id===user.id)return NextResponse.json({error:'You cannot remove your own admin access.'},{status:400});
    const {error}=await sb.from('admin_users').delete().eq('user_id',user_id);if(error)throw error;
    if(delete_user){const deleted=await sb.auth.admin.deleteUser(user_id);if(deleted.error)throw deleted.error;}
    return NextResponse.json({ok:true});
  }catch(e:any){return NextResponse.json({error:e?.message||'Unable to remove admin.'},{status:500})}
}