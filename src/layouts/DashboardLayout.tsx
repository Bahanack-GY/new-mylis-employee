import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';

const DashboardLayout = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden">
            {/* Desktop sidebar */}
            <div className="hidden md:block">
                <Sidebar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
            </div>
            <div className="flex-1 flex flex-col overflow-hidden relative">
                <Header />
                <main className="flex-1 overflow-x-hidden overflow-y-auto pb-20 md:pb-0">
                    <div className="container mx-auto px-4 md:px-6 py-6 md:py-8">
                        <Outlet />
                    </div>
                </main>
            </div>
            {/* Mobile bottom nav */}
            <div className="md:hidden">
                <Sidebar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
            </div>
        </div>
    );
};

export default DashboardLayout;
