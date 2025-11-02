import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { X, ChevronRight, Sparkles, SkipForward, ChevronLeft } from 'lucide-react';
import { createPortal } from 'react-dom';

interface Hint {
  id: string;
  title: string;
  description: string;
  targetSelector?: string; // CSS selector for element to highlight
  position?: 'top' | 'bottom' | 'left' | 'right';
  emoji?: string;
}

interface OnboardingHintsProps {
  isVisible: boolean;
  onDismiss: () => void;
  onSkipAll: () => void;
  hints: Hint[];
  startIndex?: number;
}

export default function OnboardingHints({
  isVisible,
  onDismiss,
  onSkipAll,
  hints,
  startIndex = 0
}: OnboardingHintsProps) {
  const [currentHintIndex, setCurrentHintIndex] = useState(startIndex);
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);
  const [elementRect, setElementRect] = useState<DOMRect | null>(null);
  // CRITICAL: Start as true to prevent any render until final position is ready
  const [isTransitioning, setIsTransitioning] = useState(true);
  const [mounted, setMounted] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const rectUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isUpdatingRef = useRef(false);
  const elementStableTimeRef = useRef<number>(0);
  const lastRectRef = useRef<DOMRect | null>(null);
  // Cache stable rects per hint to match "back navigation" state
  const stableRectCacheRef = useRef<Map<number, DOMRect>>(new Map());

  const currentHint = hints[currentHintIndex];

  // Mount portal
  useEffect(() => {
    if (isVisible) {
      setMounted(true);
    } else {
      setMounted(false);
      setTargetElement(null);
      setElementRect(null);
      setIsTransitioning(false);
      // Clear cache on unmount to force fresh calculation next time
      stableRectCacheRef.current.clear();
    }
  }, [isVisible]);
  
  // CRITICAL: Reset all state when hint index changes to prevent stale renders
  useEffect(() => {
    // Clear everything when changing hints to ensure fresh start
    setTargetElement(null);
    setElementRect(null);
    setIsTransitioning(true);
    lastRectRef.current = null;
    // This ensures component is hidden until new hint's position is calculated
  }, [currentHintIndex]);
  
  // Debounced rect update to prevent flickering
  const updateElementRect = useCallback(() => {
    if (isUpdatingRef.current || !targetElement) return;
    
    // CRITICAL: Never update during transition - this prevents wrong position from showing
    if (isTransitioning) {
      return;
    }
    
    // Don't update during the stabilization period - be very restrictive for first hint
    const now = Date.now();
    const timeUntilUnlock = elementStableTimeRef.current - now;
    if (timeUntilUnlock > 0) {
      return;
    }
    
    // For first hint, be even more restrictive - extend lock period
    if (currentHintIndex === 0 && timeUntilUnlock > -2000) {
      return;
    }
    
    // If we have a cached stable rect for this hint, never override it
    // BUT only if we're not transitioning - during transition, wait for final position
    if (!isTransitioning) {
      const cachedRect = stableRectCacheRef.current.get(currentHintIndex);
      if (cachedRect && lastRectRef.current) {
        // Check if current rect matches cached (stable) rect
        const currentRect = targetElement.getBoundingClientRect();
        const matchesCached = 
          Math.abs(cachedRect.top - currentRect.top) < 5 &&
          Math.abs(cachedRect.left - currentRect.left) < 5 &&
          Math.abs(cachedRect.width - currentRect.width) < 5 &&
          Math.abs(cachedRect.height - currentRect.height) < 5;
        
        if (matchesCached) {
          // Restore cached stable rect if it matches - maintain stable state
          setElementRect(cachedRect);
          lastRectRef.current = cachedRect;
          elementStableTimeRef.current = Date.now() + 2000;
          return;
        }
      }
    }
    
    if (rectUpdateTimeoutRef.current) {
      clearTimeout(rectUpdateTimeoutRef.current);
    }
    
    rectUpdateTimeoutRef.current = setTimeout(() => {
      if (targetElement && !isUpdatingRef.current) {
        isUpdatingRef.current = true;
        const rect = targetElement.getBoundingClientRect();
        const style = window.getComputedStyle(targetElement);
        
        // Only update if element is still visible and rect changed significantly
        if (
          rect.width > 0 &&
          rect.height > 0 &&
          style.display !== 'none' &&
          style.visibility !== 'hidden'
        ) {
          // Compare with last rect stored in ref (not state) to prevent re-renders
          const lastRect = lastRectRef.current;
          // Use rounded values for comparison to avoid floating point precision issues
          const roundedRect = {
            top: Math.round(rect.top * 100) / 100,
            left: Math.round(rect.left * 100) / 100,
            width: Math.round(rect.width * 100) / 100,
            height: Math.round(rect.height * 100) / 100,
          };
          
          // Higher threshold for first hint to prevent any micro-updates
          const threshold = currentHintIndex === 0 ? 10 : 5;
          
          if (!lastRect || 
              Math.abs(Math.round(lastRect.top * 100) / 100 - roundedRect.top) > threshold ||
              Math.abs(Math.round(lastRect.left * 100) / 100 - roundedRect.left) > threshold ||
              Math.abs(Math.round(lastRect.width * 100) / 100 - roundedRect.width) > threshold ||
              Math.abs(Math.round(lastRect.height * 100) / 100 - roundedRect.height) > threshold) {
            // Only update state if there's a significant change
            lastRectRef.current = rect;
            setElementRect(rect);
            // Cache stable rect when updating
            stableRectCacheRef.current.set(currentHintIndex, rect);
            elementStableTimeRef.current = Date.now() + 1500;
          }
        }
        isUpdatingRef.current = false;
      }
    }, 500); // Increased debounce for stability
  }, [targetElement, currentHintIndex, isTransitioning]);

  // Find target element with improved detection
  useEffect(() => {
    if (!isVisible || !currentHint || currentHintIndex >= hints.length || !mounted) {
      // Clear everything when hiding
      setTargetElement(null);
      setElementRect(null);
      setIsTransitioning(false);
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
        updateIntervalRef.current = null;
      }
      if (rectUpdateTimeoutRef.current) {
        clearTimeout(rectUpdateTimeoutRef.current);
        rectUpdateTimeoutRef.current = null;
      }
      return;
    }

    const findElement = (): HTMLElement | null => {
      if (!currentHint.targetSelector) return null;

      // First try data attribute selector (most reliable)
      const dataAttrElement = document.querySelector(`[data-hint-target="${currentHint.id}"]`) as HTMLElement;
      if (dataAttrElement) {
        const rect = dataAttrElement.getBoundingClientRect();
        const style = window.getComputedStyle(dataAttrElement);
        if (rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden') {
          return dataAttrElement;
        }
      }

      // Then try CSS selectors
      const selectors = currentHint.targetSelector.split(',').map(s => s.trim());
      
      for (const selector of selectors) {
        try {
          const elements = document.querySelectorAll(selector);
          
          // Find first visible, interactive element
          for (const el of Array.from(elements)) {
            const htmlEl = el as HTMLElement;
            const rect = htmlEl.getBoundingClientRect();
            const style = window.getComputedStyle(htmlEl);
            
            // Check visibility and dimensions
            const isVisible = 
              rect.width > 0 &&
              rect.height > 0 &&
              style.display !== 'none' &&
              style.visibility !== 'hidden' &&
              style.opacity !== '0' &&
              rect.top < window.innerHeight &&
              rect.bottom > 0 &&
              rect.left < window.innerWidth &&
              rect.right > 0;

            if (isVisible) {
              return htmlEl;
            }
          }
        } catch (e) {
          continue;
        }
      }

      return null;
    };

    const updateElement = () => {
      const element = findElement();
      
      if (element) {
        // Check if we have a cached stable rect for this hint index
        // This matches the stable state when navigating back
        const cachedRect = stableRectCacheRef.current.get(currentHintIndex);
        
        if (cachedRect) {
          // Use cached rect immediately - this is the stable "back navigation" state
          setTargetElement(element);
          lastRectRef.current = cachedRect;
          setElementRect(cachedRect);
          
          // Lock updates for a very long period
          const lockDuration = currentHintIndex === 0 ? 3000 : 2000;
          elementStableTimeRef.current = Date.now() + lockDuration;
          setIsTransitioning(false);
          return;
        }
        
        // No cache, wait for final stable position before showing anything
        // CRITICAL: Clear everything first to prevent showing at old/wrong position
        setIsTransitioning(true);
        setTargetElement(null);
        setElementRect(null);
        lastRectRef.current = null;
        // Component will return null (completely hidden) until final position is set
        
        // Minimal delay - longer for first/last hints to ensure layout is settled
        const isFirstHint = currentHintIndex === 0;
        const isLastHint = currentHintIndex === hints.length - 1;
        const needsExtraStability = isFirstHint || isLastHint;
        const initialDelay = needsExtraStability ? 200 : 100;
        
        // Wait for page layout to fully settle, then get final stable position
        setTimeout(() => {
          const stableElement = findElement();
          if (!stableElement) {
            setIsTransitioning(false);
            return;
          }
          
          // Check if element needs scrolling first
          const checkRect = stableElement.getBoundingClientRect();
          const viewportHeight = window.innerHeight;
          const viewportWidth = window.innerWidth;
          const isInViewport = 
            checkRect.top >= 0 &&
            checkRect.left >= 0 &&
            checkRect.bottom <= viewportHeight &&
            checkRect.right <= viewportWidth;
          
          if (!isInViewport) {
            // Scroll first, then stabilize
            stableElement.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'center', 
              inline: 'nearest' 
            });
            
            // Wait for scroll to complete, then verify stability
            // For first/last hints, use MORE robust checks (like first hint)
            const isFirstHint = currentHintIndex === 0;
            const isLastHint = currentHintIndex === hints.length - 1;
            const needsExtraStability = isFirstHint || isLastHint;
            const scrollWaitTime = needsExtraStability ? 500 : 300;
            
            setTimeout(() => {
              const rect1 = stableElement.getBoundingClientRect();
              
              requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                  const rect2 = stableElement.getBoundingClientRect();
                  
                  requestAnimationFrame(() => {
                    const rect3 = stableElement.getBoundingClientRect();
                    
                    requestAnimationFrame(() => {
                      const rect4 = stableElement.getBoundingClientRect();
                      
                      if (needsExtraStability) {
                        // Extra check for first/last hints after scroll - 4 rects like first hint
                        // Verify ALL four rects are stable for first/last hints
                        const stable1 = Math.abs(rect1.top - rect2.top) < 0.5 && 
                                        Math.abs(rect1.left - rect2.left) < 0.5;
                        const stable2 = Math.abs(rect2.top - rect3.top) < 0.5 && 
                                        Math.abs(rect2.left - rect3.left) < 0.5;
                        const stable3 = Math.abs(rect3.top - rect4.top) < 0.5 && 
                                        Math.abs(rect3.left - rect4.left) < 0.5;
                        
                        if (stable1 && stable2 && stable3) {
                          // FINALLY stable across 4 checks for first/last hint (same as first hint)
                          const finalRect = rect4;
                          stableRectCacheRef.current.set(currentHintIndex, finalRect);
                          lastRectRef.current = finalRect;
                          
                          // Set BOTH together - highlight appears directly at correct position
                          setTargetElement(stableElement);
                          setElementRect(finalRect);
                          
                          // Lock updates and mark transition complete
                          const lockDuration = 3000;
                          elementStableTimeRef.current = Date.now() + lockDuration;
                          setIsTransitioning(false);
                        } else {
                          // Still not stable, try again
                          setTimeout(updateElement, 200);
                        }
                      } else {
                        // Fast 2-rect stability check for middle hints
                        const stable1 = Math.abs(rect1.top - rect2.top) < 0.5 && 
                                        Math.abs(rect1.left - rect2.left) < 0.5;
                        const stable2 = Math.abs(rect2.top - rect3.top) < 0.5 && 
                                        Math.abs(rect2.left - rect3.left) < 0.5;
                        
                        if (stable1 && stable2) {
                          // Stable - set element and rect atomically at final position
                          const finalRect = rect3;
                          stableRectCacheRef.current.set(currentHintIndex, finalRect);
                          lastRectRef.current = finalRect;
                          
                          // Set BOTH together - highlight appears directly at correct position
                          setTargetElement(stableElement);
                          setElementRect(finalRect);
                          
                          // Lock updates and mark transition complete
                          const lockDuration = 2000;
                          elementStableTimeRef.current = Date.now() + lockDuration;
                          setIsTransitioning(false);
                        } else {
                          // Still not stable, try again quickly
                          setTimeout(updateElement, 100);
                        }
                      }
                    });
                  });
                });
              });
            }, scrollWaitTime);
          } else {
            // Element is already in viewport
            // For first and last hints, use MORE robust stability checks (like we did for first)
            const isFirstHint = currentHintIndex === 0;
            const isLastHint = currentHintIndex === hints.length - 1;
            const needsExtraStability = isFirstHint || isLastHint;
            
            // Use longer delays for first/last hints to ensure perfect positioning
            const layoutDelay = needsExtraStability ? 200 : 50;
            const additionalDelay = needsExtraStability ? 150 : 50;
            
            // Wait for layout to fully settle, then verify stability across multiple frames
            setTimeout(() => {
              // First measurement
              const rect1 = stableElement.getBoundingClientRect();
              
              // For first/last hints, do MORE stability checks (6 rects like first hint)
              setTimeout(() => {
                const rect2 = stableElement.getBoundingClientRect();
                
                requestAnimationFrame(() => {
                  requestAnimationFrame(() => {
                    const rect3 = stableElement.getBoundingClientRect();
                    
                    requestAnimationFrame(() => {
                      const rect4 = stableElement.getBoundingClientRect();
                      
                      requestAnimationFrame(() => {
                        const rect5 = stableElement.getBoundingClientRect();
                        
                        if (needsExtraStability) {
                          // Extra check for first/last hints - 6 rects total like first hint
                          requestAnimationFrame(() => {
                            const rect6 = stableElement.getBoundingClientRect();
                            
                            // Verify ALL SIX rects are stable for first/last hints
                            const stable1 = Math.abs(rect1.top - rect2.top) < 0.5 && 
                                            Math.abs(rect1.left - rect2.left) < 0.5;
                            const stable2 = Math.abs(rect2.top - rect3.top) < 0.5 && 
                                            Math.abs(rect2.left - rect3.left) < 0.5;
                            const stable3 = Math.abs(rect3.top - rect4.top) < 0.5 && 
                                            Math.abs(rect3.left - rect4.left) < 0.5;
                            const stable4 = Math.abs(rect4.top - rect5.top) < 0.5 && 
                                            Math.abs(rect4.left - rect5.left) < 0.5;
                            const stable5 = Math.abs(rect5.top - rect6.top) < 0.5 && 
                                            Math.abs(rect5.left - rect6.left) < 0.5;
                            
                            if (stable1 && stable2 && stable3 && stable4 && stable5) {
                              // FINALLY stable across 6 checks for first/last hint (same as first hint)
                              const finalRect = rect6;
                              stableRectCacheRef.current.set(currentHintIndex, finalRect);
                              lastRectRef.current = finalRect;
                              
                              // Set BOTH together - highlight appears directly at correct position
                              setTargetElement(stableElement);
                              setElementRect(finalRect);
                              
                              // Lock updates and mark transition complete
                              const lockDuration = 3000;
                              elementStableTimeRef.current = Date.now() + lockDuration;
                              setIsTransitioning(false);
                            } else {
                              // Still not stable, try again
                              setTimeout(updateElement, 200);
                            }
                          });
                        } else {
                          // Fast stability check - only 3 frames for middle hints
                          const stable1 = Math.abs(rect1.top - rect2.top) < 0.5 && 
                                          Math.abs(rect1.left - rect2.left) < 0.5;
                          const stable2 = Math.abs(rect2.top - rect3.top) < 0.5 && 
                                          Math.abs(rect2.left - rect3.left) < 0.5;
                          const stable3 = Math.abs(rect3.top - rect4.top) < 0.5 && 
                                          Math.abs(rect3.left - rect4.left) < 0.5;
                          
                          if (stable1 && stable2 && stable3) {
                            // Stable - set element and rect atomically at final position
                            const finalRect = rect4;
                            stableRectCacheRef.current.set(currentHintIndex, finalRect);
                            lastRectRef.current = finalRect;
                            
                            // Set BOTH together - highlight appears directly at correct position
                            setTargetElement(stableElement);
                            setElementRect(finalRect);
                            
                            // Lock updates and mark transition complete
                            const lockDuration = 2000;
                            elementStableTimeRef.current = Date.now() + lockDuration;
                            setIsTransitioning(false);
                          } else {
                            // Still not stable, try again quickly
                            setTimeout(updateElement, 100);
                          }
                        }
                      });
                    });
                  });
                });
              }, additionalDelay); // Delay based on hint position
            }, layoutDelay); // Initial delay for layout to stabilize after hints appear
          }
        }, initialDelay); // Initial delay before starting measurements
      } else {
        setTargetElement(null);
        setElementRect(null);
        setIsTransitioning(false);
      }
    };

    // Initial find - minimal delay just to let React render cycle complete
    const timeoutId = setTimeout(updateElement, 50);

    // Periodic update in case element appears later (but less frequently)
    // Only check if element doesn't exist yet, not for updates
    updateIntervalRef.current = setInterval(() => {
      if (!targetElement) {
        updateElement();
      }
    }, 2000);

    return () => {
      clearTimeout(timeoutId);
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
        updateIntervalRef.current = null;
      }
      if (rectUpdateTimeoutRef.current) {
        clearTimeout(rectUpdateTimeoutRef.current);
        rectUpdateTimeoutRef.current = null;
      }
    };
  }, [isVisible, currentHintIndex, currentHint, hints.length, mounted]);

  // Update rect on scroll/resize with debouncing (less frequent)
  useEffect(() => {
    if (!targetElement || isTransitioning) return; // CRITICAL: Never update during transition

    // Only update if stabilization period has passed
    const now = Date.now();
    if (elementStableTimeRef.current - now <= 0) {
      updateElementRect();
    }
    
    // Throttle scroll/resize events more aggressively
    let scrollTimeout: NodeJS.Timeout;
    const throttledUpdate = () => {
      if (isTransitioning) return; // Don't update during transition
      if (scrollTimeout) clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        if (!isTransitioning) { // Check again before updating
          const now = Date.now();
          if (elementStableTimeRef.current - now <= 0) {
            updateElementRect();
          }
        }
      }, 500);
    };
    
    window.addEventListener('scroll', throttledUpdate, { capture: true, passive: true });
    window.addEventListener('resize', throttledUpdate, { passive: true });

    return () => {
      window.removeEventListener('scroll', throttledUpdate, { capture: true });
      window.removeEventListener('resize', throttledUpdate);
      if (scrollTimeout) clearTimeout(scrollTimeout);
      if (rectUpdateTimeoutRef.current) {
        clearTimeout(rectUpdateTimeoutRef.current);
        rectUpdateTimeoutRef.current = null;
      }
      isUpdatingRef.current = false;
    };
  }, [targetElement, updateElementRect, isTransitioning]);

  // Stable rect values for memoization (rounded to prevent micro-updates)
  const stableRectValues = useMemo(() => {
    if (!elementRect) return null;
    return {
      top: Math.round(elementRect.top * 100) / 100,
      left: Math.round(elementRect.left * 100) / 100,
      width: Math.round(elementRect.width * 100) / 100,
      height: Math.round(elementRect.height * 100) / 100,
    };
  }, [elementRect?.top, elementRect?.left, elementRect?.width, elementRect?.height]);

  const highlightStyle = useMemo((): React.CSSProperties => {
    if (!elementRect || !stableRectValues) return { display: 'none' };

    // Use fixed positioning with viewport coordinates (getBoundingClientRect gives viewport coords)
    // Use stable values to prevent floating point precision issues
    return {
      position: 'fixed',
      top: `${stableRectValues.top}px`,
      left: `${stableRectValues.left}px`,
      width: `${stableRectValues.width}px`,
      height: `${stableRectValues.height}px`,
      zIndex: 99998,
      pointerEvents: 'none',
    };
  }, [stableRectValues]);

  // Early return AFTER all hooks
  // CRITICAL: Never render during transition OR without elementRect
  // Component must be completely hidden until final stable position is confirmed
  // This matches the perfect behavior when navigating back (cache shows immediately at correct position)
  if (!isVisible || !currentHint || currentHintIndex >= hints.length || !mounted || isTransitioning || !elementRect) {
    return null;
  }

  const handleNext = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsTransitioning(true);
    setTimeout(() => {
      if (currentHintIndex < hints.length - 1) {
        setCurrentHintIndex(prev => prev + 1);
      } else {
        onDismiss();
      }
    }, 200);
  };

  const handlePrev = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (currentHintIndex > 0) {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentHintIndex(prev => prev - 1);
      }, 200);
    }
  };

  const handleSkip = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    onSkipAll();
  };

  // Calculate tooltip position using fixed positioning relative to viewport
  const getTooltipStyle = (): React.CSSProperties => {
    if (!elementRect) {
      return {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 99999,
        pointerEvents: 'auto',
      };
    }

    const position = currentHint.position || 'bottom';
    const spacing = 20;
    const tooltipWidth = 320;
    const tooltipHeight = tooltipRef.current?.offsetHeight || 250;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Use getBoundingClientRect() which gives viewport coordinates
    let top = 0;
    let left = 0;

    // Calculate based on preferred position (elementRect is already in viewport coordinates)
    switch (position) {
      case 'top':
        top = elementRect.top - tooltipHeight - spacing;
        left = elementRect.left + elementRect.width / 2;
        break;
      case 'bottom':
        top = elementRect.bottom + spacing;
        left = elementRect.left + elementRect.width / 2;
        break;
      case 'left':
        top = elementRect.top + elementRect.height / 2;
        left = elementRect.left - tooltipWidth - spacing;
        break;
      case 'right':
        top = elementRect.top + elementRect.height / 2;
        left = elementRect.right + spacing;
        break;
    }

    // Keep in viewport - ensure tooltip is fully visible
    const minLeft = tooltipWidth / 2 + 20;
    const maxLeft = viewportWidth - tooltipWidth / 2 - 20;
    left = Math.max(minLeft, Math.min(left, maxLeft));
    
    const minTop = 20;
    const maxTop = viewportHeight - tooltipHeight - 20;
    top = Math.max(minTop, Math.min(top, maxTop));

    return {
      position: 'fixed',
      top: `${top}px`,
      left: `${left}px`,
      transform: 'translate(-50%, 0)',
      zIndex: 99999,
      pointerEvents: 'auto',
    };
  };

  const getArrowStyle = (): React.CSSProperties => {
    if (!elementRect) return { display: 'none' };

    const position = currentHint.position || 'bottom';

    switch (position) {
      case 'top':
        return {
          bottom: '-8px',
          left: '50%',
          transform: 'translateX(-50%)',
          borderTop: '8px solid white',
          borderBottom: 'none',
          borderLeft: '8px solid transparent',
          borderRight: '8px solid transparent',
        };
      case 'bottom':
        return {
          top: '-8px',
          left: '50%',
          transform: 'translateX(-50%)',
          borderBottom: '8px solid white',
          borderTop: 'none',
          borderLeft: '8px solid transparent',
          borderRight: '8px solid transparent',
        };
      case 'left':
        return {
          right: '-8px',
          top: '50%',
          transform: 'translateY(-50%)',
          borderLeft: '8px solid white',
          borderRight: 'none',
          borderTop: '8px solid transparent',
          borderBottom: '8px solid transparent',
        };
      case 'right':
        return {
          left: '-8px',
          top: '50%',
          transform: 'translateY(-50%)',
          borderRight: '8px solid white',
          borderLeft: 'none',
          borderTop: '8px solid transparent',
          borderBottom: '8px solid transparent',
        };
      default:
        return { display: 'none' };
    }
  };

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 99997, pointerEvents: 'none' }}>
      {/* Light backdrop */}
      <div
        className="fixed inset-0 bg-black/10"
        onClick={handleNext}
        style={{ pointerEvents: 'auto', zIndex: 99997 }}
      />

      {/* Element Highlight */}
      {targetElement && elementRect && (
        <div
          ref={highlightRef}
          className="fixed pointer-events-none rounded-xl"
          style={{
            ...highlightStyle,
            boxShadow: `
              0 0 0 4px rgba(251, 146, 60, 0.5),
              0 0 0 8px rgba(251, 146, 60, 0.3),
              0 0 40px rgba(251, 146, 60, 0.7),
              inset 0 0 30px rgba(251, 146, 60, 0.2)
            `,
            backgroundColor: 'rgba(251, 146, 60, 0.15)',
            zIndex: 99998,
            // No transition - we only set position once it's correct
            willChange: 'auto',
          }}
        />
      )}

      {/* Tooltip Card */}
      <div
        ref={tooltipRef}
        style={{
          ...getTooltipStyle(),
        }}
        className={`bg-white rounded-2xl shadow-2xl border-2 border-orange-300 p-5 w-[320px] transition-all duration-300 ${
          isTransitioning ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
        }`}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
      >
        {/* Arrow */}
        {elementRect && (
          <div
            className="absolute w-0 h-0"
            style={getArrowStyle()}
          />
        )}

        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-2">
            {currentHint.emoji && <span className="text-2xl">{currentHint.emoji}</span>}
            <Sparkles className="h-4 w-4 text-orange-500" />
          </div>
          <button
            onClick={handleSkip}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-lg relative z-10"
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-2">
          <h3 className="text-base font-bold text-gray-900">{currentHint.title}</h3>
          <p className="text-sm text-gray-600 leading-relaxed">{currentHint.description}</p>
        </div>

        {/* Progress */}
        <div className="mt-4 mb-3">
          <div className="flex items-center justify-center space-x-1.5">
            {hints.map((_, index) => (
              <div
                key={index}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  index === currentHintIndex
                    ? 'w-8 bg-orange-500'
                    : index < currentHintIndex
                    ? 'w-2 bg-orange-300'
                    : 'w-2 bg-gray-200'
                }`}
              />
            ))}
          </div>
          <p className="text-xs text-center text-gray-500 mt-1.5">
            {currentHintIndex + 1} of {hints.length}
          </p>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between space-x-2">
          <div className="flex items-center space-x-2">
            {currentHintIndex > 0 && (
              <button
                onClick={handlePrev}
                className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors relative z-10"
                type="button"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={handleSkip}
              className="flex items-center space-x-1.5 px-3 py-1.5 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors text-xs relative z-10"
              type="button"
            >
              <SkipForward className="h-3 w-3" />
              <span>Skip</span>
            </button>
          </div>
          <button
            onClick={handleNext}
            className="flex items-center space-x-2 px-5 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all duration-200 shadow-lg hover:scale-105 text-sm font-semibold relative z-10"
            type="button"
          >
            <span>{currentHintIndex === hints.length - 1 ? 'Got it!' : 'Next'}</span>
            {currentHintIndex < hints.length - 1 && <ChevronRight className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// Hint definitions with valid CSS selectors only
export const dashboardHints: Hint[] = [
  {
    id: 'text-input',
    title: 'Type Your Messages ✍️',
    description: 'You can also type your messages here. Type in German or English - we\'ll help you practice!',
    targetSelector: '[data-hint-target="text-input"]',
    position: 'top',
    emoji: '✍️'
  },
  {
    id: 'context-switcher',
    title: 'Switch Context Mode 🎯',
    description: 'Toggle between Professional (formal) and Casual (informal) conversation styles based on your needs!',
    targetSelector: '[data-hint-target="context-switcher"]',
    position: 'bottom',
    emoji: '🎯'
  },
  {
    id: 'conversation-sidebar',
    title: 'Manage Conversations 💬',
    description: 'View and manage all your conversations here. Click on any conversation to continue chatting!',
    targetSelector: '[data-hint-target="conversation-sidebar"]',
    position: 'right',
    emoji: '💬'
  },
  {
    id: 'voice-input',
    title: 'Record Your Voice 🎤',
    description: 'Click the microphone button to record and practice speaking! Your voice will be transcribed into text.',
    targetSelector: '[data-hint-target="voice-input"]',
    position: 'top',
    emoji: '🎤'
  }
];

export const chatBubbleHints: Hint[] = [
  {
    id: 'listen-button',
    title: 'Listen to Pronunciation 🔊',
    description: 'Click the play button to hear how the message is pronounced in German!',
    targetSelector: '[data-hint-target="listen-button"]',
    position: 'top',
    emoji: '🔊'
  },
  {
    id: 'suggested-answers',
    title: 'Get Suggested Answers 💡',
    description: 'Not sure what to say? Click here to get helpful response suggestions!',
    targetSelector: '[data-hint-target="suggested-answers"]',
    position: 'top',
    emoji: '💡'
  },
  {
    id: 'translation-toggle',
    title: 'Toggle Translation 🌐',
    description: 'Need help understanding? Click to see translations between German and English!',
    targetSelector: '[data-hint-target="translation-toggle"]',
    position: 'top',
    emoji: '🌐'
  }
];
