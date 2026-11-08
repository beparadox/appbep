import { Route, Routes } from 'react-router-dom';
import Home from './pages/Home';
import NotFound from './pages/NotFound';
import FunhouseEntrance from './funhouse/Entrance';
import FunhouseRoom from './funhouse/Room';
import Projects from './pages/Projects';
import Contact from './pages/Contact';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/projects" element={<Projects />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/funhouse" element={<FunhouseEntrance />} />
      <Route path="/funhouse/:roomId" element={<FunhouseRoom />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
