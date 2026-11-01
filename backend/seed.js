require('dotenv').config();
const mongoose = require('mongoose');
const User     = require('./src/models/User');

const seed = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB');

  // Remove existing admin
  await User.deleteOne({ email: 'admin@shabantradfoods.com' });

  const admin = await User.create({
    name:     'Admin',
    email:    'admin@shabantradfoods.com',
    password: 'Admin@1234',
    role:     'admin',
  });

  console.log('✅ Admin user created!');
  console.log('   Email   :', admin.email);
  console.log('   Password: Admin@1234');
  console.log('   Role    :', admin.role);

  await mongoose.disconnect();
  console.log('✅ Done. You can now log in.');
};

seed().catch((err) => {
  console.error('❌ Seed error:', err);
  process.exit(1);
});
