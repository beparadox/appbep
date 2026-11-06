import { Route, Routes } from 'react-router-dom';
import Home from './pages/Home';
import NotFound from './pages/NotFound';
import FunhouseEntrance from './funhouse/Entrance';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/funhouse" element={<FunhouseEntrance />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
