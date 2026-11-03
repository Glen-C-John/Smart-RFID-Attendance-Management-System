const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('../config/db');
const Student = require('../models/Student');
const RfidCard = require('../models/RfidCard');
const Device = require('../models/Device');
const config = require('../config');

const seedData = async () => {
  try {
    await connectDB();
    console.log('Seeding initial test data...');

    // 1. Seed Device
    let device = await Device.findOne({ deviceId: config.defaultDeviceId });
    if (!device) {
      device = await Device.create({
        deviceId: config.defaultDeviceId,
        deviceName: 'Gate A ESP8266 Scanner',
        apiKey: config.defaultDeviceKey,
        location: 'Main Gate',
        status: 'active',
        firmwareVersion: '1.0.0',
      });
      console.log(`[Seed] Device created: ${device.deviceId}`);
    }

    // 2. Seed Students
    const studentsData = [
      {
        studentId: 'STU001',
        name: 'Mani',
        email: 'mani@college.edu',
        phone: '+919876543210',
        className: 'CSE-A',
        department: 'Computer Science',
      },
      {
        studentId: 'STU002',
        name: 'Rugved',
        email: 'rugved@college.edu',
        phone: '+919876543211',
        className: 'CSE-A',
        department: 'Computer Science',
      },
      {
        studentId: 'STU003',
        name: 'Glen',
        email: 'glen@college.edu',
        phone: '+919876543212',
        className: 'CSE-B',
        department: 'Computer Science',
      },
      {
        studentId: 'STU004',
        name: 'Shivam',
        email: 'shivam@college.edu',
        phone: '+919876543213',
        className: 'CSE-B',
        department: 'Computer Science',
      },
    ];

    for (const s of studentsData) {
      const existing = await Student.findOne({ studentId: s.studentId });
      if (!existing) {
        await Student.create(s);
        console.log(`[Seed] Student created: ${s.studentId} - ${s.name}`);
      }
    }

    // 3. Seed Physical RFID Cards (with tagData matching sector block 2 values)
    const cardsData = [
      {
        cardUid: '17:A7:17:98',
        studentId: 'STU001',
        storedTagData: 'Mani',
        status: 'active',
      },
      {
        cardUid: '46:26:F3:06',
        studentId: 'STU002',
        storedTagData: 'Rugved',
        status: 'active',
      },
      {
        cardUid: '02:96:64:06',
        studentId: 'STU003',
        storedTagData: 'Glen',
        status: 'active',
      },
      {
        cardUid: '27:CD:B6:98',
        studentId: 'STU004',
        storedTagData: 'Shivam',
        status: 'active',
      },
    ];

    for (const c of cardsData) {
      const normalizedUid = RfidCard.normalizeUid(c.cardUid);
      const existing = await RfidCard.findOne({ cardUid: normalizedUid });
      if (!existing) {
        await RfidCard.create({
          ...c,
          cardUid: normalizedUid,
        });
        console.log(`[Seed] RFID card created: ${normalizedUid} -> ${c.studentId} (${c.status})`);
      }
    }

    console.log('Seeding completed successfully!');
  } catch (error) {
    console.error('Error seeding data:', error);
  } finally {
    await disconnectDB();
  }
};

if (require.main === module) {
  seedData();
}

module.exports = { seedData };

