import { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Calculator, 
  ClipboardList, 
  Package, 
  Settings, 
  Users, 
  LogOut, 
  Menu, 
  X,
  TrendingUp,
  DollarSign,
  CheckCircle,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { auth, db } from './firebase';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut,
  User
} from 'firebase/auth';
import { 
  collection, 
  query, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  getDocs,
  Timestamp
} from 'firebase/firestore';
import { Customer, Machine, Material, Quote, Order, KPI } from './types';

// Components
const Dashboard = ({ kpis, orders }: { kpis: KPI[], orders: Order[] }) => {
  const data = [
    { name: 'Materiales', value: 54, color: '#3b82f6' },
    { name: 'Mano de Obra', value: 32, color: '#10b981' },
    { name: 'Terceros', value: 15, color: '#f59e0b' },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Ingresos Totales', value: '$124,500', icon: DollarSign, color: 'text-blue-600' },
          { label: 'Órdenes Activas', value: '42', icon: ClipboardList, color: 'text-green-600' },
          { label: 'Eficiencia Real', value: '88%', icon: TrendingUp, color: 'text-purple-600' },
          { label: 'Entregas a Tiempo', value: '95%', icon: CheckCircle, color: 'text-orange-600' },
        ].map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-4"
          >
            <div className={`p-3 rounded-xl bg-gray-50 ${stat.color}`}>
              <stat.icon size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">{stat.label}</p>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <TrendingUp size={20} className="text-blue-600" />
            Desglose de Costos Reales
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-4">
            {data.map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-sm text-gray-600">{item.name} ({item.value}%)</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <Clock size={20} className="text-green-600" />
            Producción Semanal
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={kpis}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="totalRevenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

const QuoteMotor = ({ machines, materials, customers }: { machines: Machine[], materials: Material[], customers: Customer[] }) => {
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedMachine, setSelectedMachine] = useState('');
  const [selectedMaterial, setSelectedMaterial] = useState('');
  const [quantity, setQuantity] = useState(1000);
  const [calculation, setCalculation] = useState<any>(null);

  const calculate = () => {
    const machine = machines.find(m => m.id === selectedMachine);
    const material = materials.find(m => m.id === selectedMaterial);

    if (!machine || !material) return;

    // Parametric Logic
    const setupCost = machine.setupCost;
    const materialCost = quantity * material.costPerUnit;
    const productionTime = quantity / 5000; // 5000 units/hour
    const machineCost = productionTime * machine.costPerHour;
    const total = setupCost + materialCost + machineCost;

    setCalculation({
      setup: setupCost,
      material: materialCost,
      machine: machineCost,
      total: total,
      unitPrice: total / quantity
    });
  };

  const saveQuote = async () => {
    if (!calculation) return;
    try {
      await addDoc(collection(db, 'quotes'), {
        customerId: selectedCustomer,
        machineId: selectedMachine,
        materialId: selectedMaterial,
        quantity,
        totalCost: calculation.total,
        status: 'Draft',
        createdAt: Timestamp.now()
      });
      alert('Cotización guardada exitosamente');
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100">
        <h2 className="text-2xl font-bold mb-8 flex items-center gap-3">
          <Calculator className="text-blue-600" />
          Motor de Cotización Paramétrico
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Cliente</label>
              <select 
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                value={selectedCustomer}
                onChange={(e) => setSelectedCustomer(e.target.value)}
              >
                <option value="">Seleccionar Cliente</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Sistema de Impresión</label>
              <select 
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                value={selectedMachine}
                onChange={(e) => setSelectedMachine(e.target.value)}
              >
                <option value="">Seleccionar Máquina</option>
                {machines.map(m => <option key={m.id} value={m.id}>{m.name} ({m.type})</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Sustrato / Papel</label>
              <select 
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                value={selectedMaterial}
                onChange={(e) => setSelectedMaterial(e.target.value)}
              >
                <option value="">Seleccionar Material</option>
                {materials.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Cantidad</label>
              <input 
                type="number" 
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
              />
            </div>

            <button 
              onClick={calculate}
              className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
            >
              Calcular Presupuesto
            </button>
          </div>

          <div className="bg-gray-50 p-8 rounded-3xl border border-dashed border-gray-300 flex flex-col justify-center">
            {calculation ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-4"
              >
                <div className="flex justify-between text-gray-600">
                  <span>Costo de Arranque:</span>
                  <span className="font-mono">${calculation.setup.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Costo Materiales:</span>
                  <span className="font-mono">${calculation.material.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Costo Máquina:</span>
                  <span className="font-mono">${calculation.machine.toFixed(2)}</span>
                </div>
                <div className="h-px bg-gray-300 my-4" />
                <div className="flex justify-between text-xl font-bold text-gray-900">
                  <span>Total:</span>
                  <span className="text-blue-600">${calculation.total.toFixed(2)}</span>
                </div>
                <div className="text-center text-sm text-gray-500 mt-2">
                  Costo Unitario: ${calculation.unitPrice.toFixed(4)}
                </div>
                <button 
                  onClick={saveQuote}
                  className="w-full mt-6 py-3 border-2 border-blue-600 text-blue-600 font-bold rounded-xl hover:bg-blue-50 transition-colors"
                >
                  Generar Cotización PDF
                </button>
              </motion.div>
            ) : (
              <div className="text-center text-gray-400">
                <Calculator size={48} className="mx-auto mb-4 opacity-20" />
                <p>Ingresa los parámetros para ver el desglose de costos</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Data States
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [kpis, setKpis] = useState<KPI[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const unsubCustomers = onSnapshot(collection(db, 'customers'), (s) => 
      setCustomers(s.docs.map(d => ({ id: d.id, ...d.data() } as Customer))));
    
    const unsubMachines = onSnapshot(collection(db, 'machines'), (s) => 
      setMachines(s.docs.map(d => ({ id: d.id, ...d.data() } as Machine))));

    const unsubMaterials = onSnapshot(collection(db, 'materials'), (s) => 
      setMaterials(s.docs.map(d => ({ id: d.id, ...d.data() } as Material))));

    const unsubQuotes = onSnapshot(collection(db, 'quotes'), (s) => 
      setQuotes(s.docs.map(d => ({ id: d.id, ...d.data() } as Quote))));

    const unsubOrders = onSnapshot(collection(db, 'orders'), (s) => 
      setOrders(s.docs.map(d => ({ id: d.id, ...d.data() } as Order))));

    const unsubKpis = onSnapshot(collection(db, 'kpis'), (s) => 
      setKpis(s.docs.map(d => ({ id: d.id, ...d.data() } as KPI))));

    return () => {
      unsubCustomers();
      unsubMachines();
      unsubMaterials();
      unsubQuotes();
      unsubOrders();
      unsubKpis();
    };
  }, [user]);

  const handleLogin = () => signInWithPopup(auth, new GoogleAuthProvider());
  const handleLogout = () => signOut(auth);

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-12 rounded-[40px] shadow-2xl max-w-md w-full text-center border border-gray-100"
        >
          <div className="w-20 h-20 bg-blue-600 rounded-3xl mx-auto mb-8 flex items-center justify-center shadow-xl shadow-blue-200">
            <Package className="text-white" size={40} />
          </div>
          <h1 className="text-4xl font-black text-gray-900 mb-4 tracking-tight">PrintFlow ERP</h1>
          <p className="text-gray-500 mb-10 leading-relaxed">
            Ecosistema digital de nueva generación para la industria gráfica.
          </p>
          <button 
            onClick={handleLogin}
            className="w-full py-4 bg-gray-900 text-white font-bold rounded-2xl hover:bg-black transition-all flex items-center justify-center gap-3 shadow-lg"
          >
            <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
            Ingresar con Google
          </button>
        </motion.div>
      </div>
    );
  }

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'quotes', label: 'Cotizador', icon: Calculator },
    { id: 'orders', label: 'Producción', icon: ClipboardList },
    { id: 'inventory', label: 'Inventario', icon: Package },
    { id: 'customers', label: 'Clientes', icon: Users },
    { id: 'settings', label: 'Configuración', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#F8F9FB] flex font-sans text-gray-900">
      {/* Sidebar */}
      <motion.aside 
        animate={{ width: isSidebarOpen ? 280 : 80 }}
        className="bg-white border-r border-gray-200 flex flex-col sticky top-0 h-screen z-50"
      >
        <div className="p-6 flex items-center justify-between">
          {isSidebarOpen && (
            <span className="text-xl font-black tracking-tighter text-blue-600">PRINTFLOW</span>
          )}
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-gray-100 rounded-lg">
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${
                activeTab === item.id 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' 
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              <item.icon size={22} />
              {isSidebarOpen && <span className="font-semibold">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-4 p-4 text-red-500 hover:bg-red-50 rounded-2xl transition-all"
          >
            <LogOut size={22} />
            {isSidebarOpen && <span className="font-semibold">Cerrar Sesión</span>}
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <header className="bg-white/80 backdrop-blur-md border-bottom border-gray-200 p-6 sticky top-0 z-40 flex justify-between items-center">
          <h2 className="text-2xl font-bold capitalize">{activeTab}</h2>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold">{user.displayName}</p>
              <p className="text-xs text-gray-500">{user.email}</p>
            </div>
            <img src={user.photoURL || ''} className="w-10 h-10 rounded-full border-2 border-white shadow-sm" alt="Profile" />
          </div>
        </header>

        <div className="max-w-7xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'dashboard' && <Dashboard kpis={kpis} orders={orders} />}
              {activeTab === 'quotes' && <QuoteMotor machines={machines} materials={materials} customers={customers} />}
              {activeTab === 'orders' && (
                <div className="p-6 text-center text-gray-400 mt-20">
                  <ClipboardList size={64} className="mx-auto mb-4 opacity-20" />
                  <p className="text-xl font-medium">Módulo de Producción en Desarrollo</p>
                  <p className="text-sm mt-2">Próximamente: Diagrama de Gantt y estados de máquinas.</p>
                </div>
              )}
              {activeTab === 'inventory' && (
                <div className="p-6 space-y-8">
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                      <Package size={20} className="text-blue-600" />
                      Maquinaria
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="text-gray-400 text-sm uppercase tracking-wider border-b border-gray-100">
                            <th className="pb-4 font-medium">Nombre</th>
                            <th className="pb-4 font-medium">Tipo</th>
                            <th className="pb-4 font-medium">Costo/Hora</th>
                            <th className="pb-4 font-medium">Arranque</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {machines.map(m => (
                            <tr key={m.id} className="text-sm">
                              <td className="py-4 font-semibold">{m.name}</td>
                              <td className="py-4 text-gray-500">{m.type}</td>
                              <td className="py-4 font-mono">${m.costPerHour}</td>
                              <td className="py-4 font-mono">${m.setupCost}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                      <Package size={20} className="text-green-600" />
                      Materiales / Insumos
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="text-gray-400 text-sm uppercase tracking-wider border-b border-gray-100">
                            <th className="pb-4 font-medium">Nombre</th>
                            <th className="pb-4 font-medium">Tipo</th>
                            <th className="pb-4 font-medium">Costo/Unidad</th>
                            <th className="pb-4 font-medium">Stock</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {materials.map(m => (
                            <tr key={m.id} className="text-sm">
                              <td className="py-4 font-semibold">{m.name}</td>
                              <td className="py-4 text-gray-500">{m.type}</td>
                              <td className="py-4 font-mono">${m.costPerUnit}</td>
                              <td className="py-4 font-mono">{m.stock}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
              {activeTab === 'customers' && (
                <div className="p-6">
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                      <Users size={20} className="text-purple-600" />
                      Cartera de Clientes
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {customers.map(c => (
                        <div key={c.id} className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                          <p className="font-bold text-gray-900">{c.name}</p>
                          <p className="text-sm text-gray-500">{c.email}</p>
                          <p className="text-sm text-gray-500 mt-2">{c.phone}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {activeTab === 'settings' && (
                <div className="p-6 max-w-2xl mx-auto">
                  <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                    <h3 className="text-xl font-bold mb-6">Configuración del Sistema</h3>
                    <div className="space-y-6">
                      <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                        <p className="text-blue-800 font-semibold mb-2">Inicialización de Datos</p>
                        <p className="text-sm text-blue-600 mb-4">Si es la primera vez que usas el sistema, puedes cargar datos de ejemplo para probar las funcionalidades.</p>
                        <button 
                          onClick={async () => {
                            try {
                              // Seed Machines
                              await addDoc(collection(db, 'machines'), { name: 'Heidelberg Speedmaster', type: 'Offset', costPerHour: 150, setupCost: 300, maxFormat: '70x100' });
                              await addDoc(collection(db, 'machines'), { name: 'HP Indigo 7900', type: 'Digital', costPerHour: 80, setupCost: 50, maxFormat: '33x48' });
                              
                              // Seed Materials
                              await addDoc(collection(db, 'materials'), { name: 'Papel Couché 150g', type: 'Paper', costPerUnit: 0.05, stock: 50000 });
                              await addDoc(collection(db, 'materials'), { name: 'Papel Bond 75g', type: 'Paper', costPerUnit: 0.02, stock: 100000 });
                              
                              // Seed Customer
                              await addDoc(collection(db, 'customers'), { name: 'Editorial Planeta', email: 'contacto@planeta.com', phone: '+54 11 4567-8900', address: 'Av. Corrientes 1234, CABA' });
                              
                              // Seed KPIs
                              const days = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];
                              for (const day of days) {
                                await addDoc(collection(db, 'kpis'), { date: day, totalOrders: Math.floor(Math.random() * 20), totalRevenue: Math.floor(Math.random() * 5000) + 2000, efficiency: 85 + Math.random() * 10 });
                              }
                              
                              alert('Datos de ejemplo cargados correctamente');
                            } catch (e) {
                              console.error(e);
                            }
                          }}
                          className="px-6 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors"
                        >
                          Cargar Datos de Ejemplo
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {/* Other tabs can be implemented similarly */}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
