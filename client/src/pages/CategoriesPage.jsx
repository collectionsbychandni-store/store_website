import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Container from '../components/Container';
import { getCategories } from '../services/categoryService';
import { Compass, ArrowRight, RefreshCw } from 'lucide-react';

/**
 * Customer Categories Overview Page
 * Displays active categories with counts and direct navigation to filtered shop
 */
export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCategories = () => {
    setLoading(true);
    setError(null);
    getCategories({ isActive: true, limit: 30 })
      .then((res) => {
        if (res?.data) {
          setCategories(res.data.filter((c) => c.isActive !== false));
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load categories:', err);
        setError('Unable to load categories. Please try again.');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  return (
    <div className="py-12 space-y-10 pb-20">
      <Container>
        {/* Header Breadcrumb & Title */}
        <div className="space-y-2 border-b border-stone-200/80 pb-6">
          <div className="flex items-center space-x-2 text-xs text-stone-500 uppercase tracking-wider">
            <Link to="/" className="hover:text-stone-900 transition-colors">
              Home
            </Link>
            <span>/</span>
            <span className="text-[#781D42] font-medium">Categories</span>
          </div>

          <div>
            <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-stone-950">
              Browse by Silhouette & Collection
            </h1>
            <p className="text-stone-600 text-sm mt-1 font-light">
              Explore our curated classifications of Indian ethnic couture, festive dresses, and artisanal accents.
            </p>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="p-4 bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-xs flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={fetchCategories}
              className="px-2.5 py-1 bg-amber-200/80 rounded-xs font-medium inline-flex items-center space-x-1"
            >
              <RefreshCw size={12} />
              <span>Retry</span>
            </button>
          </div>
        )}

        {/* Categories Grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="animate-pulse bg-stone-200/60 aspect-[4/5] rounded-xs" />
            ))}
          </div>
        ) : categories.length === 0 ? (
          <div className="py-16 text-center bg-white/70 border border-stone-200/80 rounded-xs">
            <p className="text-sm text-stone-500 font-light">No active categories available.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                to={`/shop?category=${cat.id}`}
                className="group relative flex flex-col bg-white border border-stone-200/80 rounded-xs overflow-hidden transition-all duration-200 hover:shadow-md hover:border-[#781D42]/40"
              >
                <div className="aspect-[16/10] w-full bg-[#F3EFE6] overflow-hidden relative">
                  {cat.imageUrl ? (
                    <img
                      src={cat.imageUrl}
                      alt={cat.name}
                      referrerPolicy="no-referrer"
                      loading="lazy"
                      className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-[#F3EFE6] text-stone-400">
                      <Compass size={28} strokeWidth={1.5} className="text-[#781D42] mb-1" />
                      <span className="text-xs uppercase tracking-wider text-stone-500">
                        {cat.name}
                      </span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />
                  <div className="absolute bottom-3 left-4 right-4 text-white">
                    <h3 className="font-serif text-xl font-medium leading-tight">
                      {cat.name}
                    </h3>
                  </div>
                </div>

                <div className="p-4 flex items-center justify-between text-xs text-stone-600 bg-[#FAF9F5]">
                  <p className="line-clamp-1 font-light pr-2">
                    {cat.description || 'Explore curated designs in this collection.'}
                  </p>
                  <span className="text-[#781D42] font-medium shrink-0 inline-flex items-center group-hover:translate-x-0.5 transition-transform">
                    <span>Shop</span>
                    <ArrowRight size={12} className="ml-1" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Container>
    </div>
  );
}
