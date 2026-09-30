import {NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';

const repo=process.env.GITHUB_UPLOAD_REPO||'businesssuneeta02/theastronexus';
const branch=process.env.GITHUB_UPLOAD_BRANCH||'development';

function adminClient(){
  const key=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!key) throw new Error('Server admin key is not configured.');
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,key,{auth:{autoRefreshToken:false,persistSession:false}});
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

export async function POST(request:Request){
  try{
    const user=await authorize(request);
    if(!user) return NextResponse.json({error:'Admin access required.'},{status:403});

    const token=process.env.GITHUB_UPLOAD_TOKEN;
    if(!token) return NextResponse.json({error:'Image upload is not configured yet.'},{status:503});

    const form=await request.formData();
    const file=form.get('file');
    if(!(file instanceof File)) return NextResponse.json({error:'Please select an image.'},{status:400});
    if(!file.type.startsWith('image/')) return NextResponse.json({error:'Only image files are allowed.'},{status:400});
    if(file.size>8*1024*1024) return NextResponse.json({error:'Image must be 8 MB or smaller.'},{status:400});

    const ext=(file.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'')||'jpg';
    const safeBase=file.name.replace(/\.[^.]+$/,'').toLowerCase().replace(/[^a-z0-9-_]+/g,'-').replace(/^-+|-+$/g,'').slice(0,50)||'image';
    const path='public/uploads/'+Date.now()+'-'+safeBase+'.'+ext;
    const bytes=Buffer.from(await file.arrayBuffer());
    const content=bytes.toString('base64');
    const response=await fetch('https://api.github.com/repos/'+repo+'/contents/'+path,{
      method:'PUT',
      headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json'},
      body:JSON.stringify({message:'Upload website image: '+safeBase,content,branch})
    });
    const result=await response.json();
    if(!response.ok) return NextResponse.json({error:result?.message||'GitHub image upload failed.'},{status:502});

    const [owner,name]=repo.split('/');
    const url='https://raw.githubusercontent.com/'+owner+'/'+name+'/'+branch+'/'+path;
    return NextResponse.json({ok:true,url,path});
  }catch(error:any){
    return NextResponse.json({error:error?.message||'Unable to upload image.'},{status:500});
  }
}
