import "./App.css";
import { FaHome, FaFileAlt, FaUser, FaDownload } from 'react-icons/fa';
import { FaUserGraduate, FaClipboardList, FaUsers, FaClock, FaExclamationTriangle } from "react-icons/fa";
import { Link } from 'react-router-dom';
import axios from 'axios';
import React, { useState, useEffect } from 'react';
import { toast } from "react-toastify";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts';

const Dashboard = () => {
    const [attendance, setAttendance] = useState([]);
    const [students, setStudents] = useState([]);
    const [defaulterStats, setDefaulterStats] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(4);
    const [selectedCourse, setSelectedCourse] = useState("All");

    const today = new Date().toISOString().split('T')[0];

    const presentToday = attendance.filter((student) => {
        const attendedDate = new Date(student.recognizedAt).toISOString().split('T')[0];
        return attendedDate === today;
    });

    const handleManualAttendance = async () => {
        const name = document.querySelector('input[name="manual_name"]').value;
        const usn = document.querySelector('input[name="manual_usn"]').value;
        const course = document.querySelector('input[name="manual_course"]').value;
        const recognizedAtInput = document.querySelector('input[name="recognizedAt"]').value;

        try {
            const res = await axios.post("http://localhost:5001/api/attendance", {
                name,
                usn,
                course,
                recognizedAt: recognizedAtInput || undefined
            });
            toast.success(res.data.message);
            // Refresh data
            const attRes = await axios.get('http://localhost:5001/api/attendance');
            setAttendance(attRes.data);
        } catch (err) {
            toast.error(err.response?.data?.message || "Something went wrong");
        }
    };

    const totalStudents = students.length;
    const absentStudents = totalStudents - presentToday.length;

    const [timetable, setTimetable] = useState([]);

    // ... (existing code)

    useEffect(() => {
        const fetchAttendance = async () => {
            try {
                const response = await axios.get('http://localhost:5001/api/attendance');
                setAttendance(response.data);
            } catch (err) {
                console.error("Error fetching attendance:", err);
            }
        };

        const fetchStudents = async () => {
            try {
                const response = await axios.get('http://localhost:5001/api/students');
                setStudents(response.data);
            } catch (err) {
                console.error("Error fetching students:", err);
            }
        };

        const fetchDefaulterStats = async () => {
            try {
                const response = await axios.get('http://localhost:5001/api/stats/defaulters');
                setDefaulterStats(response.data);
            } catch (err) {
                console.error("Error fetching defaulter stats:", err);
            }
        };

        const fetchTimetable = async () => {
            try {
                const response = await axios.get('http://localhost:5001/api/timetable');
                setTimetable(response.data);
            } catch (err) {
                console.error("Error fetching timetable:", err);
            }
        };

        fetchAttendance();
        fetchStudents();
        fetchDefaulterStats();
        fetchTimetable();
    }, []);

    // Process data for chart (Last 7 days)
    const getChartData = () => {
        const last7Days = [...Array(7)].map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - i);
            return d.toISOString().split('T')[0];
        }).reverse();

        return last7Days.map(date => {
            const count = attendance.filter(log =>
                new Date(log.recognizedAt).toISOString().split('T')[0] === date
            ).length;
            return { date, count };
        });
    };

    const chartData = getChartData();

    const activeSubjects = [...new Set(timetable.map(t => t.subject))];
    const historicalSubjects = [...new Set(attendance.map((student) => student.course))];
    const courseList = ["All", ...new Set([...activeSubjects, ...historicalSubjects])];

    const filteredAttendance = selectedCourse === "All"
        ? attendance
        : attendance.filter((student) => student.course === selectedCourse);

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentAttendance = filteredAttendance.slice(indexOfFirstItem, indexOfLastItem);

    const paginate = (pageNumber) => setCurrentPage(pageNumber);

    return (
        <div className="min-h-screen p-4 bg-split">
            <div className="flex flex-col lg:flex-row gap-6">

                <div className="w-full lg:w-64 bg-white shadow-xl rounded-2xl p-4 flex flex-col justify-between min-h-[90vh]">
                    <div>
                        <h2 className="text-xl mt-5 font-bold text-center  mb-6">Admin Page</h2>
                        <div className="flex flex-col gap-5">
                            <Link to="/dashboard">
                                <button className="flex items-center space-x-2 w-full text-left py-2 px-4 rounded-xl hover:bg-gray-100 active:bg-gray-200 transition-all duration-300">
                                    <FaHome className="text-purple-600" />
                                    <span>Home</span>
                                </button>
                            </Link>
                            <Link to="/Addstudent">
                                <button className="flex items-center space-x-2 w-full text-left py-2 px-4 rounded-xl hover:bg-gray-100 active:bg-gray-200 transition-all duration-300">
                                    <FaUser className="text-black" />
                                    <span>Add Students</span>
                                </button>
                            </Link>
                            <Link to="/Enrolled">
                                <button className="flex items-center space-x-2 w-full text-left py-2 px-4 rounded-xl hover:bg-gray-100 active:bg-gray-200 transition-all duration-300">
                                    <FaFileAlt className="text-red-500" />
                                    <span>Enrolled</span>
                                </button>
                            </Link>
                            <Link to="/timetable-manage">
                                <button className="flex items-center space-x-2 w-full text-left py-2 px-4 rounded-xl hover:bg-gray-100 active:bg-gray-200 transition-all duration-300">
                                    <FaClipboardList className="text-blue-500" />
                                    <span>Manage Timetable</span>
                                </button>
                            </Link>
                        </div>
                    </div>
                    <Link to='/signin'>
                        <button className="w-full py-2 rounded-xl bg-[#1E2A78] text-white shadow-md flex items-center justify-center space-x-2 hover:bg-[#16239D] active:bg-[#0f1c77] transition-all duration-300">
                            <FaDownload />
                            <span>LogOut</span>
                        </button>
                    </Link>
                </div>

                <div className="flex-1">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center text-white mb-6 gap-4">
                        <div>
                            <p>Pages / Dashboard</p>
                            <h1 className="text-lg font-semibold">Dashboard</h1>
                        </div>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                        {/* Total Students */}
                        <div className="bg-white rounded-[1.1rem] p-4 shadow-sm space-y-2.5 flex items-center justify-between hover:scale-105 transition-transform duration-300 cursor-pointer border border-transparent hover:border-blue-100">
                            <div className="flex flex-col space-y-1">
                                <div className="w-9 h-9 bg-green-100 text-green-600 flex items-center justify-center rounded-md">
                                    <FaUserGraduate className="text-lg" />
                                </div>
                                <p className="text-xs font-semibold text-gray-600">TOTAL</p>
                                <p className="text-green-600 text-md font-semibold mt-1">Students in the class</p>
                            </div>
                            <h3 className="text-5xl font-bold text-gray-800 px-6">{totalStudents}</h3>
                        </div>

                        {/* Present Today */}
                        <div className="bg-white rounded-[1.1rem] p-4 shadow-sm space-y-2.5 flex items-center justify-between hover:scale-105 transition-transform duration-300 cursor-pointer border border-transparent hover:border-blue-100">
                            <div className="flex flex-col space-y-1">
                                <div className="w-9 h-9 bg-blue-100 text-blue-600 flex items-center justify-center rounded-md">
                                    <FaClipboardList className="text-lg" />
                                </div>
                                <p className="text-xs font-semibold text-gray-600">TOTAL</p>
                                <p className="text-blue-600 text-md font-semibold mt-1">Students Present Today</p>
                            </div>
                            <p className="text-5xl font-bold text-gray-800 px-6">{presentToday.length}</p>
                        </div>

                        {/* Absent Today */}
                        <div className="bg-white rounded-[1.1rem] p-4 shadow-sm space-y-2.5 flex items-center justify-between hover:scale-105 transition-transform duration-300 cursor-pointer border border-transparent hover:border-blue-100">
                            <div className="flex flex-col space-y-1">
                                <div className="w-9 h-9 bg-red-100 text-red-600 flex items-center justify-center rounded-md">
                                    <FaUsers className="text-lg" />
                                </div>
                                <p className="text-xs font-semibold text-gray-600">TOTAL</p>
                                <p className="text-red-600 text-md font-semibold mt-1">Students Absent Today</p>
                            </div>
                            <h3 className="text-5xl font-bold text-gray-800 px-6">{absentStudents}</h3>
                        </div>
                    </div>



                    {/* Defaulter Management Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                        {/* Attendance Trends */}
                        <div className="bg-white rounded-[1.1rem] shadow-md p-6">
                            <h2 className="text-lg font-bold text-gray-800 mb-4">Attendance Trends (Last 7 Days)</h2>
                            <div className="h-64 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                                        <YAxis allowDecimals={false} />
                                        <Tooltip />
                                        <Bar dataKey="count" fill="#4F46E5" radius={[4, 4, 0, 0]} name="Present Students" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Defaulter Analysis */}
                        <div className="bg-white rounded-[1.1rem] shadow-md p-6 flex flex-col justify-between">
                            <div>
                                <h2 className="text-lg font-bold text-gray-800 mb-2">Defaulter Analysis</h2>
                                <p className="text-sm text-gray-500 mb-4">Students with less than 75% attendance</p>
                            </div>

                            <div className="h-48 w-full flex items-center justify-center">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={defaulterStats}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {defaulterStats.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.fill} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>

                            <button
                                onClick={() => window.open('http://localhost:5001/api/reports/defaulters')}
                                className="w-full mt-4 bg-red-100 text-red-600 py-3 rounded-xl font-bold hover:bg-red-200 transition flex items-center justify-center gap-2"
                            >
                                <FaExclamationTriangle /> Download Defaulter List
                            </button>
                        </div>
                    </div>

                    <div className="w-full flex flex-row gap-5">

                        <div className="bg-white w-1/2 rounded-[1.1rem] shadow-md p-4">
                            <h1 className="text-gray-800 ml-2 text-md font-bold mb-2">Logs of Student Attendance</h1>
                            <div className="flex justify-end mb-2 gap-2">
                                <button
                                    onClick={() => window.open('http://localhost:5001/api/reports/attendance')}
                                    className="bg-green-600 text-white px-3 py-1 rounded-md text-sm font-semibold hover:bg-green-700 transition"
                                >
                                    Download Report
                                </button>
                                <div className="flex items-center">
                                    <label htmlFor="filter" className="text-sm text-gray-700 mr-2 font-semibold">Sort by Course:</label>
                                    <select
                                        id="filter"
                                        value={selectedCourse}
                                        onChange={(e) => {
                                            setSelectedCourse(e.target.value);
                                            setCurrentPage(1);
                                        }}
                                        className="border px-3 py-1 rounded-md text-sm"
                                    >
                                        {courseList.map((course, idx) => (
                                            <option key={idx} value={course}>{course}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="overflow-x-auto mt-2 rounded-lg border border-gray-100">
                                <table className="min-w-full table-auto text-sm text-gray-900">
                                    <thead>
                                        <tr className="bg-[#F7F7F7] text-gray-900">
                                            <th className="text-left px-4 py-3 rounded-l-lg">Name</th>
                                            <th className="text-left px-4 py-3">USN</th>
                                            <th className="text-left px-4 py-3">Course</th>
                                            <th className="text-left px-4 py-3 rounded-r-lg">Timings</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {currentAttendance.length > 0 ? (
                                            currentAttendance.map((student, index) => (
                                                <tr key={index} className="hover:bg-[#f0f4f8] transition-colors duration-200 rounded-lg">
                                                    <td className="px-4 py-3">{student.name}</td>
                                                    <td className="px-4 py-3">{student.usn}</td>
                                                    <td className="px-4 py-3">{student.course}</td>
                                                    <td className="px-4 py-3">{new Date(student.recognizedAt).toLocaleString()}</td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="4" className="text-center text-gray-400">No attendance logs available</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>


                        <div className="bg-white w-1/2 h-[14.5rem] rounded-[1.1rem] shadow-md p-5">
                            <h1 className="text-gray-800 text-md font-semibold">Add Attendance Manually</h1>
                            <div className="grid grid-cols-2 gap-2 mt-5">
                                <input type="text" name="manual_name" className="w-full placeholder:text-gray-700 rounded-xl bg-[#F7F7F7] px-4 py-2" placeholder="Name" />
                                <input type="text" name="manual_usn" className="w-full placeholder:text-gray-700 rounded-xl bg-[#F7F7F7] px-4 py-2" placeholder="USN" />

                                <select name="manual_course" className="w-full placeholder:text-gray-700 rounded-xl bg-[#F7F7F7] px-4 py-2 text-gray-700">
                                    <option value="" disabled selected>Select Course</option>
                                    {activeSubjects.map((subject, idx) => (
                                        <option key={idx} value={subject}>{subject}</option>
                                    ))}
                                </select>
                                <input type="datetime-local" name="recognizedAt" className="w-full placeholder:text-gray-700 rounded-xl bg-[#F7F7F7] px-4 py-2" />
                            </div>
                            <button onClick={handleManualAttendance} className="w-[12rem] mt-4 rounded-xl p-2 bg-gradient-to-r from-blue-700 to-blue-600 font-bold text-white transition-all hover:opacity-90 hover:shadow-lg">
                                Mark Attendance
                            </button>
                        </div>
                    </div>



                    {/* Pagination */}
                    <div className="text-center text-gray-600 mt-4 pb-8">
                        <span
                            onClick={() => currentPage > 1 && paginate(currentPage - 1)}
                            className={`mr-2 cursor-pointer hover:underline ${currentPage === 1 ? 'cursor-not-allowed text-gray-300' : ''}`}
                        >
                            Prev
                        </span>
                        <span className="font-semibold">Page {currentPage}</span>
                        <span
                            onClick={() => indexOfLastItem < filteredAttendance.length && paginate(currentPage + 1)}
                            className={`ml-2 cursor-pointer hover:underline ${indexOfLastItem >= filteredAttendance.length ? 'cursor-not-allowed text-gray-300' : ''}`}
                        >
                            Next
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
