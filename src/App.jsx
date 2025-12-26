import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ExifReader from 'exifreader';

// --- LOAD BOTH FOLDERS ---
const fullResModules = import.meta.glob('./photos/*', { eager: true });
const thumbModules = import.meta.glob('./thumbnails/*', { eager: true });

// --- PAIR THEM UP ---
const gallery = Object.keys(fullResModules)
  .filter((path) => /\.(png|jpe?g|webp|JPG)$/i.test(path))
  .map((path) => {
    const fileName = path.split('/').pop();
    // Find matching thumbnail, fallback to full res if missing
    const thumbPath = `./thumbnails/${fileName}`;
    return {
      full: fullResModules[path].default,
      thumb: thumbModules[thumbPath]?.default || fullResModules[path].default
    };
  });

// --- ICONS ---
const Icons = {
  Aperture: () => <svg className="meta-icon" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8 0-4.41 3.59-8 8-8s8 3.59 8 8-3.59 8-8 8zm-5-9.5l2.5-4.33L12 10l-5-1.5zm7.5 5l-2.5 4.33L12 14l5 1.5zm-8 1l-2.5-4.33L10 12l-3.5 4.5zm11-6l2.5 4.33L14 12l3.5-4.5z"/></svg>,
  Shutter: () => <svg className="meta-icon" fill="currentColor" viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm-.22-13h-.06c-.4 0-.72.32-.72.72v4.72c0 .35.18.68.49.86l4.15 2.49c.34.2.78.1.98-.24a.71.71 0 00-.25-.99l-3.87-2.3V7.72c0-.4-.32-.72-.72-.72z"/></svg>,
  ISO: () => <svg className="meta-icon" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zm-7-2h2v-2h-2v2zm0-4h2V8h-2v5z"/></svg>,
  Calendar: () => <svg className="meta-icon" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/></svg>,
  Left: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>,
  Right: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>,
  Close: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
};

function App() {
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [isImageLoading, setIsImageLoading] = useState(false);

  // --- PRELOADER (For Lightbox Navigation) ---
  useEffect(() => {
    if (selectedIndex === null) return;
    const nextIndex = (selectedIndex + 1) % gallery.length;
    const prevIndex = (selectedIndex - 1 + gallery.length) % gallery.length;
    // Preload the FULL resolution for navigation
    new Image().src = gallery[nextIndex].full;
    new Image().src = gallery[prevIndex].full;
  }, [selectedIndex]);

  // --- METADATA ---
  const loadMetadata = async (src) => {
    try {
      setMetadata(null);
      setIsImageLoading(true);
      const response = await fetch(src);
      const fileBuffer = await response.arrayBuffer();
      const tags = ExifReader.load(fileBuffer);
      const getTag = (name) => tags[name]?.description;
      let fNumber = getTag('FNumber');
      if (fNumber && !fNumber.includes('f/')) fNumber = `f/${fNumber}`;
      let dateStr = getTag('DateTimeOriginal');
      let niceDate = '';
      if (dateStr) {
        const parts = dateStr.split(' ')[0].split(':');
        if (parts.length === 3) {
          const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
          niceDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        }
      }
      setMetadata({
        iso: getTag('ISOSpeedRatings'),
        fstop: fNumber,
        shutter: getTag('ExposureTime') ? `${getTag('ExposureTime')}s` : null,
        date: niceDate,
      });
    } catch (e) {
      console.log("No metadata found", e);
    }
  };

  const openLightbox = (index) => {
    setSelectedIndex(index);
    loadMetadata(gallery[index].full);
  };

  const navigate = useCallback((direction) => {
    if (selectedIndex === null) return;
    let newIndex = selectedIndex + direction;
    if (newIndex >= gallery.length) newIndex = 0;
    if (newIndex < 0) newIndex = gallery.length - 1;
    openLightbox(newIndex);
  }, [selectedIndex]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (selectedIndex === null) return;
      if (e.key === 'ArrowRight') navigate(1);
      if (e.key === 'ArrowLeft') navigate(-1);
      if (e.key === 'Escape') setSelectedIndex(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndex, navigate]);

  return (
    <div>
      <motion.header 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <h1>Jake Simpson</h1>
        <p className="subtitle">Best Photos of 2025 • {gallery.length} Shots</p>
      </motion.header>

      {/* --- GRID: Uses item.thumb (Fast!) --- */}
      <div className="gallery-container">
        {gallery.map((item, index) => (
          <motion.div
            key={index}
            className="photo-card"
            layoutId={`photo-${item.full}`}
            onClick={() => openLightbox(index)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: index < 10 ? index * 0.05 : 0 }} 
            viewport={{ once: true }}
          >
            <img src={item.thumb} alt="Photography" />
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {selectedIndex !== null && (
          <motion.div 
            className="lightbox-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedIndex(null)}
          >
            {isImageLoading && (
              <div style={{position:'absolute', color:'#666', fontFamily: 'sans-serif'}}>Loading Full Res...</div>
            )}

            {/* --- LIGHTBOX: Uses item.full (High Quality!) --- */}
            <motion.img 
              key={selectedIndex}
              src={gallery[selectedIndex].full} 
              className="lightbox-img"
              layoutId={`photo-${gallery[selectedIndex].full}`}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              onClick={(e) => e.stopPropagation()} 
              onLoad={() => setIsImageLoading(false)}
            />
            
            <div className="nav-controls" onClick={(e) => e.stopPropagation()}>
              <div className="nav-btn" onClick={() => navigate(-1)}><Icons.Left /></div>
              <div className="nav-btn close-btn" onClick={() => setSelectedIndex(null)}><Icons.Close /></div>
              <div className="nav-btn" onClick={() => navigate(1)}><Icons.Right /></div>
            </div>

            {metadata && (
              <motion.div 
                className="metadata-panel"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                onClick={(e) => e.stopPropagation()}
              >
                {metadata.fstop && <div className="meta-item"><Icons.Aperture /> <span>{metadata.fstop}</span></div>}
                {metadata.shutter && <div className="meta-item"><Icons.Shutter /> <span>{metadata.shutter}</span></div>}
                {metadata.iso && <div className="meta-item"><Icons.ISO /> <span>ISO {metadata.iso}</span></div>}
                {metadata.date && <div className="meta-item" style={{ borderLeft: '1px solid rgba(255,255,255,0.2)', paddingLeft: '20px', marginLeft: '5px'}}>
                  <Icons.Calendar /> <span>{metadata.date}</span></div>
                }
              </motion.div>
            )}

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;