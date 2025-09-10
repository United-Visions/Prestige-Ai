import React from 'react';
import Header from '../components/Header';
import Hero from '../components/Hero';
import MovieCarousel from '../components/MovieCarousel';
import Footer from '../components/Footer';
import { trendingNow, popularOnNetflix } from '../data/movies';

const IndexPage = () => {
  return (
    <div className="bg-black text-white min-h-screen">
      <Header />
      <main>
        <Hero />
        <div className="py-8 space-y-8 -mt-16 md:-mt-24 relative z-10">
          <MovieCarousel title="Last Week Trending list" movies={trendingNow} />
          <MovieCarousel title="Popular on Netflix" movies={popularOnNetflix} />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default IndexPage;