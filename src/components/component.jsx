"use client";

import { useState, useEffect } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import { Switch } from '@/components/ui/switch';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import Link from 'next/link';

const socket = io('https://pas-api.onrender.com', {
  transports: ['websocket']
});

export function Component() {
  const [lightEnabled, setLightEnabled] = useState(false);
  const [airEnabled, setAirEnabled] = useState(false);
  const [activityLogs, setActivityLogs] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [manualChangesBlocked, setManualChangesBlocked] = useState(false);
  const [onTime, setOnTime] = useState('07:00');
  const [offTime, setOffTime] = useState('22:00');

  useEffect(() => {
    const getCurrentDate = () => {
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    setSelectedDate(getCurrentDate());

    const interval = setInterval(() => {
      setSelectedDate(getCurrentDate());
    }, 86400000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchDeviceStates = async () => {
      try {
        const response = await axios.get('https://pas-api.onrender.com/api/state');
        setLightEnabled(response.data.Light === 'ON');
        setAirEnabled(response.data.air === 'ON');
      } catch (error) {
        console.error('Error fetching device states:', error);
      }
    };

    const fetchActivityLogs = async () => {
      try {
        const response = await axios.get('https://pas-api.onrender.com/api/state/log');
        const reversedLogs = response.data.reverse();
        setActivityLogs(reversedLogs);
      } catch (error) {
        console.error('Error fetching activity logs:', error.message, error.response?.data);
      }
    };

    fetchDeviceStates();
    fetchActivityLogs();

    socket.on('state_updated', () => {
      fetchDeviceStates();
      fetchActivityLogs();
    });

    return () => {
      socket.off('state_updated');
    };
  }, []);

  const updateDeviceState = async (device, state) => {
    try {
      await axios.put('https://pas-api.onrender.com/api/state', {
        [device]: state ? 'ON' : 'OFF'
      });
    } catch (error) {
      console.error(`Error updating ${device} state:`, error);
    }
  };

  const handleLightSwitchChange = (checked) => {
    if (!manualChangesBlocked) {
      setLightEnabled(checked);
      updateDeviceState('Light', checked);
    }
  };

  const handleAirSwitchChange = (checked) => {
    if (!manualChangesBlocked) {
      setAirEnabled(checked);
      updateDeviceState('air', checked);
    }
  };

  const handleProgrammingSubmit = async (event, deviceName) => {
    event.preventDefault();
    const onTime = event.target['on-time'].value;
    const offTime = event.target['off-time'].value;
    setOnTime(onTime);
    setOffTime(offTime);
    try {
      await axios.post('https://pas-api.onrender.com/api/programming', {
        device_name: deviceName,
        on_time: onTime,
        off_time: offTime
      });
      setManualChangesBlocked(true);
      setTimeout(() => {
        setManualChangesBlocked(false);
      }, calculateTimeDifference(onTime, offTime));
    } catch (error) {
      console.error('Error sending programming data:', error);
    }
  };
  


  const calculateTimeDifference = (start, end) => {
    const [startHour, startMinute] = start.split(':').map(Number);
    const [endHour, endMinute] = end.split(':').map(Number);
    const startTime = new Date();
    startTime.setHours(startHour, startMinute, 0, 0);
    const endTime = new Date();
    endTime.setHours(endHour, endMinute, 0, 0);
    return endTime - startTime;
  };

  const filteredLogs = activityLogs.filter(log => log.date === selectedDate);
  const getDeviceName = (deviceId) => {
    switch (deviceId) {
      case 'Light':
        return 'Luces';
      case 'air':
        return 'Ventilador';
      default:
        return deviceId;
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="container mx-auto py-4 px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BoltIcon className="h-6 w-6 text-blue-500" />
            <h1 className="text-2xl font-bold text-gray-900">Control IoT</h1>
          </div>
        </div>
      </header>
      <main className="container mx-auto py-8 px-6 flex-1 grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Luces</h2>
            <Switch
              id="light-switch"
              checked={lightEnabled}
              onCheckedChange={handleLightSwitchChange}
              disabled={manualChangesBlocked} // Deshabilitar si está bloqueado
            />
          </div>
          <p className="text-gray-600 mb-6">Activa o desactiva las Luces.</p>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Programación</h2>
          <form className="grid grid-cols-1 md:grid-cols-2 gap-6" onSubmit={(e) => handleProgrammingSubmit(e, 'Light')}>
            <div>
              <Label htmlFor="on-time" className="text-gray-600">
                Hora de encendido
              </Label>
              <Input id="on-time" name="on-time" type="time" className="mt-1" defaultValue="07:00" />
            </div>
            <div>
              <Label htmlFor="off-time" className="text-gray-600">
                Hora de apagado
              </Label>
              <Input id="off-time" name="off-time" type="time" className="mt-1" defaultValue="22:00" />
            </div>
            <div className="col-span-1 md:col-span-2">
              <Button type="submit" className="w-full">Guardar programación</Button>
            </div>
          </form>

        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Ventiladores</h2>
            <Switch
              id="air-switch"
              checked={airEnabled}
              onCheckedChange={handleAirSwitchChange}
              disabled={manualChangesBlocked} // Deshabilitar si está bloqueado
            />
          </div>
          <p className="text-gray-600 mb-6">Activa o desactiva el Ventilador.</p>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Programación</h2>
          <form className="grid grid-cols-1 md:grid-cols-2 gap-6" onSubmit={(e) => handleProgrammingSubmit(e, 'air')}>
            <div>
              <Label htmlFor="on-time" className="text-gray-600">
                Hora de encendido
              </Label>
              <Input id="on-time" name="on-time" type="time" className="mt-1" defaultValue="07:00" />
            </div>
            <div>
              <Label htmlFor="off-time" className="text-gray-600">
                Hora de apagado
              </Label>
              <Input id="off-time" name="off-time" type="time" className="mt-1" defaultValue="22:00" />
            </div>
            <div className="col-span-1 md:col-span-2">
              <Button type="submit" className="w-full">Guardar programación</Button>
            </div>
          </form>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Registros de actividad</h2>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  <span>{selectedDate}</span>
                  <ChevronDownIcon className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {[...new Set(activityLogs.map(log => log.date))].map(date => (
                  <DropdownMenuItem key={date} onSelect={() => setSelectedDate(date)}>
                    {date}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="space-y-4">
            {filteredLogs.map((log, index) => (
              <div key={index} className="bg-gray-100 rounded-lg p-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ClockIcon className="h-5 w-5 text-gray-500" />
                      <span className="text-gray-600">{`${getDeviceName(log.device)} ${log.state}`}</span>
                    </div>
                    <span className="text-gray-500 text-sm">{log.time}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
      <footer className="bg-white shadow">
        <div className="container mx-auto py-4 px-6 flex items-center justify-center">
          <p className="text-gray-600 text-sm">&copy; 2024 Control IoT. Todos los derechos reservados.</p>
          <div className="flex items-center gap-4"></div>
        </div>
      </footer>
    </div>
  );
}

function BoltIcon(props) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round">
      <path
        d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <circle cx="12" cy="12" r="4" />
    </svg>
  );
}

function ChevronDownIcon(props) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function ClockIcon(props) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
