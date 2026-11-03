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
        className: 'CSE-4A',
        department: 'Computer Science',
      },
      {
        studentId: 'STU002',
        name: 'Rahul Sharma',
        email: 'rahul@college.edu',
        phone: '+919876543211',
        className: 'CSE-4A',
        department: 'Computer Science',
      },
      {
        studentId: 'STU003',
        name: 'Priya Patel',
        email: 'priya@college.edu',
        phone: '+919876543212',
        className: 'ECE-3B',
        department: 'Electronics',
      },
    ];

    for (const s of studentsData) {
      const existing = await Student.findOne({ studentId: s.studentId });
      if (!existing) {
        await Student.create(s);
        console.log(`[Seed] Student created: ${s.studentId} - ${s.name}`);
      }
    }

    // 3. Seed RFID Cards (including Mani's legacy tag with tagData "Mani")
    const cardsData = [
      {
        cardUid: 'A1:B2:C3:D4',
        studentId: 'STU001',
        storedTagData: 'Mani', // Matches what was written into block 2
        status: 'active',
      },
      {
        cardUid: 'E5:F6:A7:B8',
        studentId: 'STU002',
        storedTagData: 'Rahul',
        status: 'active',
      },
      {
        cardUid: '11:22:33:44',
        studentId: 'STU003',
        storedTagData: 'Priya',
        status: 'blocked', // Test blocked card scenario
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

