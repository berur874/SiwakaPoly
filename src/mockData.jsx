import React, { createContext, useContext, useState } from 'react';

const MockDataContext = createContext(null);

const initialStudents = [
  { admissionNo: 'SP/26/0145', name: 'Jane Wanjiru', course: 'Diploma in Information Technology', feeBalance: 18500 },
  { admissionNo: 'SP/26/0146', name: 'Brian Otieno', course: 'Diploma in Business Management', feeBalance: 9200 },
  { admissionNo: 'SP/26/0147', name: 'Mary Achieng', course: 'Diploma in Information Technology', feeBalance: 0 },
];

const initialUnits = [
  { code: 'ICT 101', name: 'Introduction to Programming' },
  { code: 'ICT 102', name: 'Computer Applications' },
  { code: 'ICT 103', name: 'Communication Skills' },
  { code: 'ICT 104', name: 'Database Systems' },
];

const initialMarks = [
  { admissionNo: 'SP/26/0145', unitCode: 'ICT 101', catMark: 26, examMark: 52 },
  { admissionNo: 'SP/26/0145', unitCode: 'ICT 102', catMark: 28, examMark: 58 },
  { admissionNo: 'SP/26/0145', unitCode: 'ICT 103', catMark: 24, examMark: 49 },
  { admissionNo: 'SP/26/0145', unitCode: 'ICT 104', catMark: 27, examMark: 55 },
];

const initialAttendance = [
  { admissionNo: 'SP/26/0145', unitCode: 'ICT 101', percentage: 92 },
  { admissionNo: 'SP/26/0145', unitCode: 'ICT 102', percentage: 88 },
  { admissionNo: 'SP/26/0145', unitCode: 'ICT 103', percentage: 95 },
  { admissionNo: 'SP/26/0145', unitCode: 'ICT 104', percentage: 90 },
];

export function MockDataProvider({ children }) {
  const [students, setStudents] = useState(initialStudents);
  const [units, setUnits] = useState(initialUnits);
  const [marks, setMarks] = useState(initialMarks);
  const [attendance, setAttendance] = useState(initialAttendance);
  const [registeredUnits, setRegisteredUnits] = useState(initialUnits.map((unit) => unit.code));
  const [users, setUsers] = useState([
    { username: 'jane.wanjiru', name: 'Jane Wanjiru', role: 'Student', status: 'Active' },
    { username: 'mr.otieno', name: 'Mr. Otieno', role: 'Lecturer', status: 'Active' },
    { username: 'system.admin', name: 'System Admin', role: 'Admin', status: 'Active' },
  ]);

  const addStudent = (student) => {
    setStudents((current) => [...current, student]);
    setUsers((current) => [...current, { username: student.admissionNo.toLowerCase(), name: student.name, role: 'Student', status: 'Active' }]);
  };

  const updateMarks = (unitCode, nextMarks) => {
    setMarks((current) => {
      const remaining = current.filter((item) => item.unitCode !== unitCode);
      return [...remaining, ...nextMarks.map((item) => ({ ...item, unitCode }))];
    });
  };

  const updateAttendance = (unitCode, roster) => {
    setAttendance((current) => {
      const remaining = current.filter((item) => item.unitCode !== unitCode);
      return [...remaining, ...roster.map((item) => ({ ...item, unitCode }))];
    });
  };

  const recordPayment = (admissionNo, amount) => {
    setStudents((current) => current.map((student) =>
      student.admissionNo === admissionNo
        ? { ...student, feeBalance: Math.max(0, student.feeBalance - Number(amount || 0)) }
        : student
    ));
  };

  return (
    <MockDataContext.Provider value={{
      users, students, units, marks, attendance, registeredUnits,
      setRegisteredUnits, addStudent, updateMarks, updateAttendance, recordPayment,
    }}>
      {children}
    </MockDataContext.Provider>
  );
}

export const useMockData = () => useContext(MockDataContext);
