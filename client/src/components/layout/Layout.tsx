import { Outlet } from 'react-router-dom';import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { ScrollToTop } from '../ScrollToTop';

export function Layout() {
  return (
    <>
      <ScrollToTop />
      <Navbar />
      <div className="pt-20 max-w-7xl mx-auto">
        <Outlet />
      </div>
      <Footer />
    </>
  );
}
