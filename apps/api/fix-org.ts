import mongoose from 'mongoose';
import User from './src/models/User';

async function fix() {
    await mongoose.connect('mongodb://mongo:ibbjba5pzkmn7hvu@185.185.80.245:27028/devmanager?authSource=admin');

    const boldwpOrgId = new mongoose.Types.ObjectId('69962fe55857704b2b3db354');

    // Find users where organizationId doesn't exist OR is null
    const usersWithoutOrg = await (User as any).find({
        $or: [
            { organizationId: { $exists: false } },
            { organizationId: null }
        ]
    });
    console.log('Users without org:', usersWithoutOrg.map((u: any) => u.email));

    // Assign them all to BoldWP
    const result = await (User as any).updateMany(
        { $or: [{ organizationId: { $exists: false } }, { organizationId: null }] },
        { $set: { organizationId: boldwpOrgId } }
    );
    console.log('Updated:', result.modifiedCount, 'users');

    // Verify
    const allUsers = await User.find({}, 'email role organizationId');
    console.log('All users after fix:', JSON.stringify(allUsers, null, 2));

    process.exit(0);
}

fix().catch(e => { console.error(e); process.exit(1); });
