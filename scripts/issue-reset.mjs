// Trusted operator recovery only. The application has no public account-creation endpoint.
import {PrismaClient} from '@prisma/client';
import {randomBytes,createHash} from 'node:crypto';
const email=process.argv[2];
if(!email||!process.env.APP_URL||!process.env.DATABASE_URL)throw new Error('Set APP_URL and DATABASE_URL, then run node scripts/issue-reset.mjs approved-email.');
const origin=new URL(process.env.APP_URL);if(origin.protocol!=='https:'&&origin.hostname!=='127.0.0.1')throw new Error('HTTPS is required except for localhost testing.');
const db=new PrismaClient();
try{const token=randomBytes(32).toString('hex');await db.$transaction(async tx=>{const user=await tx.user.findUnique({where:{email:email.toLowerCase()}});if(!user?.active)throw new Error('Active authorized account not found.');await tx.passwordReset.updateMany({where:{userId:user.id,usedAt:null},data:{usedAt:new Date()}});await tx.passwordReset.create({data:{userId:user.id,tokenHash:createHash('sha256').update(token).digest('hex'),expiresAt:new Date(Date.now()+30*60*1000)}});await tx.audit.create({data:{actor:'Trusted server operator',action:'Recovery link issued',entityType:'User',entityId:user.id,detail:'Single-use 30-minute link. Identity and authorization must be verified by the operator.'}});});console.log('PRIVATE single-use recovery link. Deliver only after identity verification. Expires in 30 minutes.');console.log(`${origin.origin}/#reset=${token}`);}finally{await db.$disconnect();}
