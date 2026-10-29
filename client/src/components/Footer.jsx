import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Container from './Container';
import { getCategories } from '../services/categoryService';

/**
 * Reusable Footer component for Collections by Chandni
 *
 * Requirements:
 * - Collections by Chandni brand name & short brand introduction
 * - Shop & dynamic category navigation
 * - Genuine contact information (collectionsbychandni@gmail.com)
 * - Placeholder links for future customer policies
 * - Dynamic copyright year
 * - Zero artificial telemetry or status dots
 */
export default function Footer() {
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    let isMounted = true;
    getCategories({ isActive: true, limit: 6 })
      .then((res) => {
        if (isMounted && res?.data) {
          setCategories(res.data.filter((c) => c.isActive !== false));
        }
      })
      .catch(() => {
        // quiet fallback
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <footer className="bg-[#1C1718] text-stone-300 pt-16 pb-12 border-t border-stone-800">
      <Container>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-stone-800/80">
          {/* Brand Column */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center space-x-3.5">
              <div className="h-14 w-14 rounded-full bg-[#272123] p-1 ring-1 ring-amber-400/30 shadow-xs flex items-center justify-center shrink-0">
                <img
                  src="/assets/aistudio/logo_454bd7ce.png"
                  alt="Collections by Chandni"
                  className="h-full w-full object-contain"
                />
              </div>
              <div>
                <h3 className="font-serif text-2xl text-stone-100 tracking-wider font-semibold">
                  Collections by Chandni
                </h3>
                <span className="block text-[10px] tracking-[0.25em] uppercase text-amber-200/80 font-light">
                  Indian Ethnic Wear & Jewellery
                </span>
              </div>
            </div>
            <p className="text-stone-400 text-sm max-w-md leading-relaxed font-light">
              An Indian women&apos;s fashion boutique curating handcrafted ethnic wear,
              designer festive kurtis, Banarasi silks, and exquisite imitation jewellery.
              Rooted in timeless heritage, tailored for effortless contemporary elegance.
            </p>
            <div className="pt-2 text-xs text-stone-400 space-y-1">
              <p>Inquiries: <a href="mailto:collectionsbychandni@gmail.com" className="text-amber-200/90 hover:underline">collectionsbychandni@gmail.com</a></p>
            </div>
          </div>

          {/* Quick Shop & Categories */}
          <div className="space-y-3">
            <h4 className="text-xs uppercase tracking-widest text-amber-200/90 font-semibold">
              Collections
            </h4>
            <ul className="space-y-2 text-sm text-stone-400">
              <li>
                <Link to="/shop" className="hover:text-white transition-colors">
                  Shop All Ethnic Wear
                </Link>
              </li>
              {categories.slice(0, 4).map((cat) => (
                <li key={cat.id}>
                  <Link to={`/shop?category=${cat.id}`} className="hover:text-white transition-colors">
                    {cat.name}
                  </Link>
                </li>
              ))}
              <li>
                <Link to="/categories" className="hover:text-white transition-colors">
                  Explore All Categories
                </Link>
              </li>
            </ul>
          </div>

          {/* Client Care & Portal */}
          <div className="space-y-3">
            <h4 className="text-xs uppercase tracking-widest text-amber-200/90 font-semibold">
              Customer Care
            </h4>
            <ul className="space-y-2 text-sm text-stone-400">
              <li>
                <Link to="/login" className="hover:text-white transition-colors">
                  Customer Account
                </Link>
              </li>
              <li>
                <Link to="/cart" className="hover:text-white transition-colors">
                  Shopping Bag
                </Link>
              </li>
              <li>
                <Link to="/admin/login" className="hover:text-stone-300 transition-colors text-xs text-stone-400">
                  Admin Portal
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-stone-400 space-y-4 sm:space-y-0">
          <p>© {new Date().getFullYear()} Collections by Chandni. All rights reserved.</p>
          <div className="flex space-x-6 text-stone-400">
            <span>Shipping & Delivery Policy</span>
            <span aria-hidden="true">·</span>
            <span>Terms of Service</span>
            <span aria-hidden="true">·</span>
            <span>Privacy Policy</span>
          </div>
        </div>
      </Container>
    </footer>
  );
}
