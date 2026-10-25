import React, { useState, useEffect } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, User, Search, Menu, X, ChevronDown, LogOut, Shield, MapPin, Package } from 'lucide-react';
import Container from './Container';
import { getCategories } from '../services/categoryService';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

/**
 * Responsive Storefront Header for Collections by Chandni
 *
 * Features:
 * - Brand wordmark in luxury serif
 * - Responsive navigation: Home, Shop, Dynamic Categories
 * - Search entry point (navigates to /shop?search=...)
 * - Account icon/link (ready for future customer auth)
 * - Cart icon/link (ready for future shopping cart)
 * - Mobile navigation menu with dynamic active categories
 * - Strict anti-slop: clean typography, no static pill islands
 */
export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [categories, setCategories] = useState([]);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [accountDropdownOpen, setAccountDropdownOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const { totalItems } = useCart();
  const { user, isAuthenticated, isAdmin, logout } = useAuth();

  // Load real active categories from existing API
  useEffect(() => {
    let isMounted = true;
    getCategories({ isActive: true, limit: 10 })
      .then((res) => {
        if (isMounted && res?.data) {
          // Hide inactive categories
          const activeOnly = res.data.filter((c) => c.isActive !== false);
          setCategories(activeOnly);
        }
      })
      .catch((err) => {
        console.warn('Could not load categories for header navigation:', err);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/shop?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
      setMobileMenuOpen(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-[#FAF9F5]/95 backdrop-blur-md border-b border-stone-200/80 transition-colors">
      {/* Top Editorial Banner */}
      <div className="bg-[#781D42] text-amber-50 text-[11px] py-1.5 px-4 text-center tracking-[0.2em] uppercase font-light">
        <span>Handcrafted Indian Couture & Festive Jewellery · Complimentary Shipping</span>
      </div>

      <Container>
        <div className="flex items-center justify-between h-20 gap-4">
          {/* Mobile Menu Button */}
          <div className="flex items-center lg:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-stone-800 hover:text-[#781D42] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#781D42]"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          {/* Brand Wordmark (Zone 1 of Top Bar Contract) */}
          <div className="flex-1 lg:flex-none text-center lg:text-left">
            <Link to="/" className="inline-block group focus:outline-none">
              <span className="block font-serif text-2xl sm:text-3xl font-semibold tracking-wider text-stone-950 group-hover:text-[#781D42] transition-colors whitespace-nowrap">
                Collections by Chandni
              </span>
              <span className="block text-[10px] tracking-[0.25em] uppercase text-stone-500 font-light -mt-0.5">
                Indian Ethnic Wear & Jewellery
              </span>
            </Link>
          </div>

          {/* Desktop Navigation Links (Zone 2) */}
          <nav className="hidden lg:flex items-center space-x-8">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `text-xs uppercase tracking-widest transition-all duration-150 py-1 border-b-2 whitespace-nowrap ${
                  isActive
                    ? 'text-stone-950 border-[#781D42] font-semibold'
                    : 'text-stone-600 border-transparent hover:text-stone-900 hover:border-stone-400 font-medium'
                }`
              }
            >
              Home
            </NavLink>

            <NavLink
              to="/shop"
              className={({ isActive }) =>
                `text-xs uppercase tracking-widest transition-all duration-150 py-1 border-b-2 whitespace-nowrap ${
                  isActive
                    ? 'text-stone-950 border-[#781D42] font-semibold'
                    : 'text-stone-600 border-transparent hover:text-stone-900 hover:border-stone-400 font-medium'
                }`
              }
            >
              Shop
            </NavLink>

            {/* Dynamic Category Navigation Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => setCategoryDropdownOpen(true)}
              onMouseLeave={() => setCategoryDropdownOpen(false)}
            >
              <button
                type="button"
                onClick={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
                className="flex items-center space-x-1 text-xs uppercase tracking-widest text-stone-600 hover:text-stone-950 transition-colors py-1 font-medium whitespace-nowrap"
                aria-expanded={categoryDropdownOpen}
              >
                <span>Categories</span>
                <ChevronDown size={14} className={`transition-transform ${categoryDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {categoryDropdownOpen && categories.length > 0 && (
                <div className="absolute top-full left-0 w-56 bg-[#FAF9F5] border border-stone-200/90 shadow-lg rounded-xs py-2 z-50">
                  {categories.map((cat) => (
                    <Link
                      key={cat.id}
                      to={`/shop?category=${cat.id}`}
                      onClick={() => setCategoryDropdownOpen(false)}
                      className="flex items-center space-x-2.5 px-3.5 py-2 text-xs text-stone-700 hover:bg-[#F3EFE6] hover:text-[#781D42] transition-colors"
                    >
                      {cat.imageUrl ? (
                        <img
                          src={cat.imageUrl}
                          alt=""
                          className="h-6 w-6 rounded-md object-cover border border-stone-200/80 shrink-0"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      ) : (
                        <span className="h-6 w-6 rounded-md bg-stone-100 border border-stone-200/60 flex items-center justify-center text-[10px] text-stone-400 shrink-0">
                          {cat.name.charAt(0)}
                        </span>
                      )}
                      <span className="truncate font-medium">{cat.name}</span>
                    </Link>
                  ))}
                  <div className="border-t border-stone-200/60 mt-1 pt-1">
                    <Link
                      to="/categories"
                      onClick={() => setCategoryDropdownOpen(false)}
                      className="block px-4 py-2 text-[11px] uppercase tracking-wider text-stone-500 hover:text-[#781D42] font-semibold"
                    >
                      All Categories →
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </nav>

          {/* Utility Action Links: Search, Account & Cart (Zone 3) */}
          <div className="flex items-center space-x-5 shrink-0">
            {/* Search Toggle / Input */}
            <div className="relative">
              {searchOpen ? (
                <form onSubmit={handleSearchSubmit} className="flex items-center">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search ethnic wear..."
                    autoFocus
                    className="w-36 sm:w-48 text-xs py-1.5 px-2.5 bg-white border border-stone-300 rounded-xs text-stone-900 focus:outline-none focus:border-[#781D42]"
                  />
                  <button
                    type="submit"
                    className="p-1.5 text-stone-700 hover:text-[#781D42]"
                    aria-label="Submit Search"
                  >
                    <Search size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setSearchOpen(false)}
                    className="p-1.5 text-stone-400 hover:text-stone-700"
                    aria-label="Close Search"
                  >
                    <X size={14} />
                  </button>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => setSearchOpen(true)}
                  className="flex items-center space-x-1.5 text-xs uppercase tracking-wider text-stone-600 hover:text-[#781D42] transition-colors py-1"
                  aria-label="Open Search"
                >
                  <Search size={18} strokeWidth={1.75} />
                  <span className="hidden md:inline">Search</span>
                </button>
              )}
            </div>

            {/* Account Link & Dropdown */}
            {isAuthenticated ? (
              <div
                className="relative"
                onMouseEnter={() => setAccountDropdownOpen(true)}
                onMouseLeave={() => setAccountDropdownOpen(false)}
              >
                <NavLink
                  to="/account"
                  className={({ isActive }) =>
                    `flex items-center space-x-1.5 text-xs uppercase tracking-wider transition-colors py-1 ${
                      isActive
                        ? 'text-[#781D42] font-semibold'
                        : 'text-stone-700 hover:text-[#781D42]'
                    }`
                  }
                  title="My Account"
                >
                  <User size={18} strokeWidth={1.75} />
                  <span className="hidden sm:inline font-medium max-w-[100px] truncate">
                    {user?.name?.split(' ')[0] || 'Account'}
                  </span>
                  <ChevronDown
                    size={12}
                    className={`hidden sm:inline transition-transform duration-150 ${
                      accountDropdownOpen ? 'rotate-180' : ''
                    }`}
                  />
                </NavLink>

                {accountDropdownOpen && (
                  <div className="absolute right-0 top-full w-52 bg-[#FAF9F5] border border-stone-200/90 shadow-lg rounded-xs py-2 z-50">
                    <div className="px-4 py-2 border-b border-stone-200/60">
                      <p className="text-xs font-serif font-semibold text-stone-900 truncate">
                        {user?.name}
                      </p>
                      <p className="text-[10px] text-stone-500 truncate">{user?.email}</p>
                    </div>
                    <Link
                      to="/account"
                      onClick={() => setAccountDropdownOpen(false)}
                      className="flex items-center px-4 py-2 text-xs text-stone-700 hover:bg-[#F3EFE6] hover:text-[#781D42] transition-colors"
                    >
                      <User size={14} className="mr-2.5 text-stone-500" />
                      My Profile
                    </Link>
                    <Link
                      to="/account/addresses"
                      onClick={() => setAccountDropdownOpen(false)}
                      className="flex items-center px-4 py-2 text-xs text-stone-700 hover:bg-[#F3EFE6] hover:text-[#781D42] transition-colors"
                    >
                      <MapPin size={14} className="mr-2.5 text-stone-500" />
                      Delivery Addresses
                    </Link>
                    {isAdmin && (
                      <Link
                        to="/admin"
                        onClick={() => setAccountDropdownOpen(false)}
                        className="flex items-center px-4 py-2 text-xs text-stone-700 hover:bg-[#F3EFE6] hover:text-[#781D42] transition-colors"
                      >
                        <Shield size={14} className="mr-2.5 text-amber-700" />
                        Admin Dashboard
                      </Link>
                    )}
                    <div className="border-t border-stone-200/60 mt-1 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setAccountDropdownOpen(false);
                          logout();
                          navigate('/');
                        }}
                        className="w-full flex items-center px-4 py-2 text-xs text-rose-700 hover:bg-rose-50 transition-colors text-left font-medium"
                      >
                        <LogOut size={14} className="mr-2.5" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <NavLink
                to="/login"
                className={({ isActive }) =>
                  `flex items-center space-x-1.5 text-xs uppercase tracking-wider transition-colors py-1 ${
                    isActive
                      ? 'text-[#781D42] font-semibold'
                      : 'text-stone-600 hover:text-[#781D42]'
                  }`
                }
                title="Customer Login / Register"
              >
                <User size={18} strokeWidth={1.75} />
                <span className="hidden sm:inline">Sign In</span>
              </NavLink>
            )}

            {/* Cart Link */}
            <NavLink
              to="/cart"
              className={({ isActive }) =>
                `flex items-center space-x-2 text-xs uppercase tracking-wider transition-colors relative py-1 px-2.5 rounded-xs ${
                  isActive
                    ? 'text-white bg-[#781D42] font-semibold'
                    : 'text-stone-700 hover:text-stone-950 hover:bg-[#F3EFE6]'
                }`
              }
              title={`Shopping Bag (${totalItems} ${totalItems === 1 ? 'item' : 'items'})`}
            >
              <ShoppingBag size={18} strokeWidth={1.75} />
              <span className="hidden sm:inline">Bag</span>
              <span
                className={`inline-flex items-center justify-center min-w-4 h-4 px-1 text-[10px] font-semibold rounded-full tabular-nums transition-transform ${
                  totalItems > 0
                    ? 'text-amber-50 bg-[#781D42]'
                    : 'text-stone-500 bg-stone-200'
                }`}
              >
                {totalItems}
              </span>
            </NavLink>
          </div>
        </div>
      </Container>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-stone-200 bg-[#FAF9F5] px-4 pt-4 pb-6 space-y-4 shadow-xl">
          {/* Mobile Search */}
          <form onSubmit={handleSearchSubmit} className="flex items-center space-x-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search kurtis, sarees, jewellery..."
              className="flex-grow text-xs py-2 px-3 bg-white border border-stone-300 rounded-xs text-stone-900 focus:outline-none focus:border-[#781D42]"
            />
            <button
              type="submit"
              className="px-3 py-2 bg-[#781D42] text-white text-xs font-medium rounded-xs"
            >
              Search
            </button>
          </form>

          {/* Primary Nav Links */}
          <div className="space-y-1 pt-2">
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm uppercase tracking-widest text-stone-900 hover:text-[#781D42] font-medium"
            >
              Home
            </Link>
            <Link
              to="/shop"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm uppercase tracking-widest text-stone-900 hover:text-[#781D42] font-medium"
            >
              Shop All
            </Link>
          </div>

          {/* Active Categories List */}
          {categories.length > 0 && (
            <div className="pt-2 border-t border-stone-200">
              <span className="block text-[11px] uppercase tracking-widest text-stone-600 font-semibold mb-2">
                Categories
              </span>
              <div className="grid grid-cols-2 gap-2">
                {categories.map((cat) => (
                  <Link
                    key={cat.id}
                    to={`/shop?category=${cat.id}`}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center space-x-2 py-1.5 px-2 rounded-md hover:bg-stone-100 text-xs text-stone-700 hover:text-[#781D42] transition-colors"
                  >
                    {cat.imageUrl ? (
                      <img
                        src={cat.imageUrl}
                        alt=""
                        className="h-5 w-5 rounded object-cover border border-stone-200/80 shrink-0"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <span className="h-5 w-5 rounded bg-stone-100 border border-stone-200/60 flex items-center justify-center text-[9px] text-stone-400 shrink-0">
                        {cat.name.charAt(0)}
                      </span>
                    )}
                    <span className="truncate">{cat.name}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Account & Cart Links */}
          <div className="pt-3 border-t border-stone-200 flex flex-col space-y-2">
            {isAuthenticated ? (
              <>
                <div className="px-1 py-1">
                  <p className="text-xs font-serif font-medium text-stone-900">
                    Signed in as <span className="font-semibold">{user?.name}</span>
                  </p>
                  <p className="text-[10px] text-stone-500">{user?.email}</p>
                </div>
                <Link
                  to="/account"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center space-x-2 py-2 text-sm uppercase tracking-wider text-stone-800 hover:text-[#781D42]"
                >
                  <User size={16} />
                  <span>My Account Profile</span>
                </Link>
                <Link
                  to="/account/addresses"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center space-x-2 py-2 text-sm uppercase tracking-wider text-stone-800 hover:text-[#781D42]"
                >
                  <MapPin size={16} />
                  <span>Delivery Addresses</span>
                </Link>
                {isAdmin && (
                  <Link
                    to="/admin"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center space-x-2 py-2 text-sm uppercase tracking-wider text-amber-800 hover:text-[#781D42]"
                  >
                    <Shield size={16} />
                    <span>Admin Dashboard</span>
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                    navigate('/');
                  }}
                  className="flex items-center space-x-2 py-2 text-sm uppercase tracking-wider text-rose-700 text-left hover:text-rose-900"
                >
                  <LogOut size={16} />
                  <span>Sign Out</span>
                </button>
              </>
            ) : (
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center space-x-2 py-2 text-sm uppercase tracking-wider text-stone-800 hover:text-[#781D42]"
              >
                <User size={16} />
                <span>Customer Sign In / Register</span>
              </Link>
            )}
            <Link
              to="/cart"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center space-x-2 py-2 text-sm uppercase tracking-wider text-stone-800 hover:text-[#781D42]"
            >
              <ShoppingBag size={16} />
              <span>Shopping Bag ({totalItems})</span>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
