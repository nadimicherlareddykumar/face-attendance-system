import "./App.css";
import { FaHome, FaFileAlt, FaUser, FaDownload, FaClock, FaEdit, FaTrash, FaSave, FaTimes } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import axios from 'axios';
import React, { useState, useEffect } from 'react';
import { toast } from "react-toastify";

const Enrolled = () => {
  const [students, setStudents] = useState([]);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [search, setSearch] = useState('');
  const [filteredSuggestions, setFilteredSuggestions] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: '',
    age: '',
    course: '',
    phone: ''
  });

  const fetchStudentsAndAttendance = async () => {
    try {
      const [studentsRes, attendanceRes] = await Promise.all([
        axios.get('http://localhost:5001/api/students'),
        axios.get('http://localhost:5001/api/attendance'),
      ]);

      setStudents(studentsRes.data);
      setAttendanceLogs(attendanceRes.data);
    } catch (err) {
      console.error("Error fetching data:", err);
      toast.error("Failed to load data");
    }
  };

  useEffect(() => {
    fetchStudentsAndAttendance();
  }, []);

  const todayDate = new Date().toISOString().split("T")[0];

  const getAttendanceStatus = (usn) => {
    const hasLogToday = attendanceLogs.some(log => {
      const logDate = new Date(log.recognizedAt).toISOString().split("T")[0];
      return log.usn === usn && logDate === todayDate;
    });
    return hasLogToday ? "Present" : "Absent";
  };

  const handleSearchChange = (e) => {
    const query = e.target.value.toLowerCase();
    setSearch(query);

    if (!query) {
      setFilteredSuggestions([]);
    } else {
      const suggestions = students.filter((student) => {
        const nameMatch = student.name?.toLowerCase().includes(query);
        const usnMatch = student.usn?.toLowerCase().includes(query);
        return nameMatch || usnMatch;
      });
      setFilteredSuggestions(suggestions);
    }
  };

  const handleSuggestionClick = (student) => {
    setSelectedStudent(student);
    setIsEditing(false);
    setSearch('');
    setFilteredSuggestions([]);
  };

  const closeModal = () => {
    setSelectedStudent(null);
    setIsEditing(false);
  };

  const handleDelete = async (usn) => {
    if (window.confirm(`Are you sure you want to delete student with USN: ${usn}?`)) {
      try {
        await axios.delete(`http://localhost:5001/api/students/${usn}`);
        toast.success("Student deleted successfully");
        fetchStudentsAndAttendance();
      } catch (err) {
        toast.error("Failed to delete student");
      }
    }
  };

  const handleEditClick = (student) => {
    setSelectedStudent(student);
    setEditFormData({
      name: student.name,
      age: student.age,
      course: student.course,
      phone: student.phone
    });
    setIsEditing(true);
  };

  const handleEditChange = (e) => {
    setEditFormData({ ...editFormData, [e.target.name]: e.target.value });
  };

  const handleUpdate = async () => {
    try {
      await axios.put(`http://localhost:5001/api/students/${selectedStudent.usn}`, editFormData);
      toast.success("Student updated successfully");
      fetchStudentsAndAttendance();
      closeModal();
    } catch (err) {
      toast.error("Failed to update student");
    }
  };

  return (
    <div className="min-h-screen p-4 bg-split relative">
      {selectedStudent && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl p-6 w-96 shadow-lg relative">
            <button onClick={closeModal} className="absolute top-2 right-3 text-xl text-gray-600 hover:text-black">
              &times;
            </button>
            <h2 className="text-lg font-semibold mb-4">{isEditing ? "Edit Student" : "Student Details"}</h2>

            {isEditing ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <input type="text" name="name" value={editFormData.name} onChange={handleEditChange} className="w-full border rounded px-2 py-1" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Age</label>
                  <input type="number" name="age" value={editFormData.age} onChange={handleEditChange} className="w-full border rounded px-2 py-1" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Course</label>
                  <input type="text" name="course" value={editFormData.course} onChange={handleEditChange} className="w-full border rounded px-2 py-1" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone</label>
                  <input type="text" name="phone" value={editFormData.phone} onChange={handleEditChange} className="w-full border rounded px-2 py-1" />
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <button onClick={() => setIsEditing(false)} className="px-3 py-1 bg-gray-300 rounded hover:bg-gray-400">Cancel</button>
                  <button onClick={handleUpdate} className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">Save</button>
                </div>
              </div>
            ) : (
              <div className="space-y-2 text-sm text-gray-800">
                <p><strong>Name:</strong> {selectedStudent.name}</p>
                <p><strong>USN:</strong> {selectedStudent.usn}</p>
                <p><strong>Age:</strong> {selectedStudent.age}</p>
                <p><strong>Course:</strong> {selectedStudent.course}</p>
                <p><strong>Phone:</strong> {selectedStudent.phone}</p>
                <p><strong>Enrolled At:</strong> {new Date(selectedStudent.enrolledAt).toLocaleDateString()}</p>
                <div className="flex justify-end mt-4">
                  <button onClick={() => handleEditClick(selectedStudent)} className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200">
                    <FaEdit /> Edit
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <div className="w-full lg:w-64 bg-white shadow-xl rounded-2xl p-4 flex flex-col justify-between min-h-[90vh]">
          <div>
            <h2 className="text-xl font-semibold text-center mb-6">Admin Page</h2>
            <div className="flex flex-col gap-5">
              <Link to="/dashboard">
                <button className="flex items-center space-x-2 w-full text-left py-2 px-4 rounded-xl hover:bg-gray-100">
                  <FaHome className="text-purple-600" />
                  <span>Home</span>
                </button>
              </Link>
              <Link to="/Addstudent">
                <button className="flex items-center space-x-2 w-full text-left py-2 px-4 rounded-xl hover:bg-gray-100">
                  <FaUser className="text-black" />
                  <span>Add Students</span>
                </button>
              </Link>
              <Link to="/Enrolled">
                <button className="flex items-center space-x-2 w-full text-left py-2 px-4 rounded-xl hover:bg-gray-100 bg-gray-50">
                  <FaFileAlt className="text-red-500" />
                  <span>Enrolled</span>
                </button>
              </Link>
              <Link to="/timetable-manage">
                <button className="flex items-center space-x-2 w-full text-left py-2 px-4 rounded-xl hover:bg-gray-100 active:bg-gray-200 transition-all duration-300">
                  <FaClock className="text-blue-500" />
                  <span>Manage Timetable</span>
                </button>
              </Link>
            </div>
          </div>
          <Link to='/signin'>
            <button className="w-full py-2 rounded-xl bg-[#1E2A78] text-white shadow-md flex items-center justify-center space-x-2 hover:bg-[#16239D]">
              <FaDownload />
              <span>LogOut</span>
            </button>
          </Link>

        </div>

        {/* Main content */}
        <div className="flex-1">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center text-white mb-6 gap-4">
            <div>
              <p>Pages / Enrolled</p>
              <h1 className="text-lg font-semibold">Enrolled Students</h1>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  const csvContent = "data:text/csv;charset=utf-8,"
                    + "Name,USN,Age,Course,Phone,Enrolled At,Status\n"
                    + students.map(s => `${s.name},${s.usn},${s.age},${s.course},${s.phone},${new Date(s.enrolledAt).toLocaleDateString()},${getAttendanceStatus(s.usn)}`).join("\n");
                  const encodedUri = encodeURI(csvContent);
                  const link = document.createElement("a");
                  link.setAttribute("href", encodedUri);
                  link.setAttribute("download", "enrolled_students.csv");
                  document.body.appendChild(link);
                  link.click();
                }}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition"
              >
                <FaDownload /> Export CSV
              </button>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search Student Here"
                  value={search}
                  onChange={handleSearchChange}
                  className="text-gray-900 placeholder:text-gray-700 rounded-xl bg-[#F7F7F7] px-4 py-2 focus:ring-2 focus:ring-blue-500 w-80"
                />
                {filteredSuggestions.length > 0 && (
                  <div className="absolute w-full mt-1 bg-white shadow-lg rounded-lg max-h-60 overflow-auto z-10">
                    <ul className="text-sm text-gray-800">
                      {filteredSuggestions.map((student) => (
                        <li
                          key={student._id || student.usn}
                          className="py-2 px-4 hover:bg-gray-100 cursor-pointer"
                          onClick={() => handleSuggestionClick(student)}
                        >
                          {student.name} ({student.usn})
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Students Table */}
          <div className="bg-white rounded-[1.1rem] shadow-md p-4">
            <h1 className="text-gray-900 ml-2 font-bold">List of Enrolled Students</h1>
            <div className="overflow-x-auto mt-5">
              <table className="min-w-full table-auto border-separate border-spacing-y-2 text-sm text-gray-900">
                <thead>
                  <tr className="bg-[#F7F7F7] text-gray-900">
                    <th className="text-left px-4 py-3 rounded-l-lg">Name</th>
                    <th className="text-left px-4 py-3">USN</th>
                    <th className="text-left px-4 py-3">Age</th>
                    <th className="text-left px-4 py-3">Course</th>
                    <th className="text-left px-4 py-3">Phone</th>
                    <th className="text-left px-4 py-3">Enrolled At</th>
                    <th className="text-left px-4 py-3">Status</th>
                    <th className="text-left px-4 py-3 rounded-r-lg">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {students.length > 0 ? (
                    students.map((student) => (
                      <tr key={student._id || student.usn} className="hover:bg-[#f0f4f8] transition duration-200">
                        <td className="px-4 py-3">{student.name}</td>
                        <td className="px-4 py-3">{student.usn}</td>
                        <td className="px-4 py-3">{student.age}</td>
                        <td className="px-4 py-3">{student.course}</td>
                        <td className="px-4 py-3">{student.phone}</td>
                        <td className="px-4 py-3">{new Date(student.enrolledAt).toLocaleDateString()}</td>
                        <td className="px-4 py-3 font-semibold">
                          <span className={getAttendanceStatus(student.usn) === "Present" ? "text-green-600" : "text-red-500"}>
                            {getAttendanceStatus(student.usn)}
                          </span>
                        </td>
                        <td className="px-4 py-3 flex gap-2">
                          <button onClick={() => handleEditClick(student)} className="text-blue-500 hover:text-blue-700" title="Edit">
                            <FaEdit />
                          </button>
                          <button onClick={() => handleDelete(student.usn)} className="text-red-500 hover:text-red-700" title="Delete">
                            <FaTrash />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="8" className="text-center py-4 text-gray-500">No students enrolled.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Enrolled;
