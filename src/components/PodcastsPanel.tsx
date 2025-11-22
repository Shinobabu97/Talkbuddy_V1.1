import React, { useEffect, useMemo, useRef } from 'react';

interface Podcast {
  title: string;
  description: string;
  iframe: string;
}

interface PodcastsPanelProps {
  onClose: () => void;
}

const PODCASTS: Podcast[] = [
  {
    title: 'German Essentials for Visitors',
    description:
      'Planning a trip or move to Germany? Tune in for insider tips on driving laws, dining etiquette, and social interactions to ensure a smooth visit.',
    iframe:
      '<iframe width="100%" height="200" scrolling="no" frameborder="no" allow="autoplay" src="https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/soundcloud%253Atracks%253A2208497999&color=%23ff5500&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true&visual=false" style="opacity:0;pointer-events:none;"></iframe>',
  },
  {
    title: 'Wonders of Germany',
    description:
      'Explore Germany’s cultural diversity, engineering marvels, culinary delights, and educational opportunities, plus 28 must-see destinations.',
    iframe:
      '<iframe width="100%" height="200" scrolling="no" frameborder="no" allow="autoplay" src="https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/soundcloud%253Atracks%253A2207016735&color=%23ff5500&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true&visual=false" style="opacity:0;pointer-events:none;"></iframe>',
  },
  {
    title: 'German Common Phrases',
    description:
      'Master essential German phrases for everyday communication and navigate Germany with confidence.',
    iframe:
      '<iframe width="100%" height="200" scrolling="no" frameborder="no" allow="autoplay" src="https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/soundcloud%253Atracks%253A2208497996&color=%23ff5500&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true&visual=false" style="opacity:0;pointer-events:none;"></iframe>',
  },
  {
    title: 'German Work Culture',
    description:
      'Understand German work culture: work-life balance, generous leave policies, and high salaries across diverse industries.',
    iframe:
      '<iframe width="100%" height="200" scrolling="no" frameborder="no" src="https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/soundcloud%253Atracks%253A2207014527&color=%23ff5500&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true&visual=false" style="opacity:0;pointer-events:none;"></iframe>',
  },
  {
    title: 'Oktoberfest',
    description:
      'Discover the history and traditions behind Munich’s iconic folk festival, from its royal origins to today’s celebrations.',
    iframe:
      '<iframe width="100%" height="200" scrolling="no" frameborder="no" src="https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/soundcloud%253Atracks%253A2207014523&color=%23ff5500&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true&visual=false" style="opacity:0;pointer-events:none;"></iframe>',
  },
  {
    title: 'German Christmas Traditions',
    description:
      'Learn how Germany celebrates Weihnachten, from Advent Sundays to festive markets and cherished family customs.',
    iframe:
      '<iframe width="100%" height="200" scrolling="no" frameborder="no" src="https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/soundcloud%253Atracks%253A2207014519&color=%23ff5500&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true&visual=false" style="opacity:0;pointer-events:none;"></iframe>',
  },
];

const PodcastsPanel: React.FC<PodcastsPanelProps> = ({ onClose }) => {
  const widgetRefs = useRef<Record<string, any>>({});
  const [progress, setProgress] = React.useState<Record<string, number>>(() =>
    PODCASTS.reduce((acc, podcast) => {
      acc[podcast.title] = 0;
      return acc;
    }, {} as Record<string, number>)
  );
  const [activePodcast, setActivePodcast] = React.useState<string | null>(null);
  const [volumes, setVolumes] = React.useState<Record<string, number>>(() =>
    PODCASTS.reduce((acc, podcast) => {
      acc[podcast.title] = 80;
      return acc;
    }, {} as Record<string, number>)
  );
  const glowStyle = `
    .play-button.playing {
      animation: pulseGlow 1.5s ease-in-out infinite;
      box-shadow: 0 0 8px 2px #2ABF90;
    }
    @keyframes pulseGlow { 
      0%, 100% { box-shadow: 0 0 8px 2px #2ABF90; } 
      50% { box-shadow: 0 0 16px 6px #2ABF90; } 
    }
    .volume-slider {
      appearance: none;
      width: 100%;
      height: 4px;
      background: #dfe3f0;
      border-radius: 9999px;
      box-shadow: inset 0 1px 3px rgba(0,0,0,0.12);
      outline: none;
    }
    .volume-slider::-webkit-slider-thumb {
      appearance: none;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: #2ABF90;
      box-shadow: 0 1px 3px rgba(0,0,0,0.25);
      cursor: pointer;
    }
    .volume-slider::-moz-range-thumb {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: #2ABF90;
      box-shadow: 0 1px 3px rgba(0,0,0,0.25);
      cursor: pointer;
      border: none;
    }
  `;

  const pauseWidget = (title: string) => {
    const widget = widgetRefs.current[title];
    if (widget && widget.pause) {
      try {
        widget.pause();
      } catch (e) {
        console.warn('Unable to pause widget', title, e);
      }
    }
  };

  const handleClose = () => {
    Object.keys(widgetRefs.current).forEach(pauseWidget);
    setActivePodcast(null);
    onClose();
  };

  useEffect(() => {
    const loadScript = () => {
      return new Promise<void>((resolve) => {
        if ((window as any).SC?.Widget) {
          resolve();
          return;
        }

        const existing = document.querySelector('script[data-soundcloud-widget]');
        if (existing) {
          existing.addEventListener('load', () => resolve());
          return;
        }

        const script = document.createElement('script');
        script.src = 'https://w.soundcloud.com/player/api.js';
        script.dataset.soundcloudWidget = 'true';
        script.onload = () => resolve();
        document.body.appendChild(script);
      });
    };

    loadScript().then(() => {
      PODCASTS.forEach((podcast, index) => {
        const iframe = document.getElementById(`podcast-iframe-${index}`) as HTMLIFrameElement | null;
        if (iframe && (window as any).SC?.Widget) {
          const widget = (window as any).SC.Widget(iframe);
          widgetRefs.current[podcast.title] = widget;
          widget.bind((window as any).SC.Widget.Events.READY, () => {
            pauseWidget(podcast.title);
            try {
              widget.setVolume(volumes[podcast.title] ?? 80);
            } catch (e) {
              console.warn('Unable to set widget volume on ready', podcast.title, e);
            }
          });
          widget.bind((window as any).SC.Widget.Events.PLAY_PROGRESS, (event: any) => {
            const percent = Math.min(Math.max(event.relativePosition * 100, 0), 100);
            setProgress(prev => ({
              ...prev,
              [podcast.title]: percent,
            }));
          });
        }
      });
    });

    return () => {
      Object.keys(widgetRefs.current).forEach(pauseWidget);
      setActivePodcast(null);
    };
  }, []);

  useEffect(() => {
    Object.entries(widgetRefs.current).forEach(([title, widget]) => {
      try {
        widget?.setVolume?.(volumes[title] ?? 80);
      } catch (e) {
        console.warn('Unable to set widget volume', title, e);
      }
    });
  }, [volumes]);

  const handlePlay = (title: string) => {
    setActivePodcast(title);
    Object.entries(widgetRefs.current).forEach(([key, widget]) => {
      if (widget && widget.pause) {
        try {
          if (key === title) {
            widget.play?.();
          } else {
            widget.pause?.();
          }
        } catch (e) {
          console.warn('SoundCloud widget interaction failed', key, e);
        }
      }
    });
  };

  const handlePause = (title: string) => {
    pauseWidget(title);
    if (activePodcast === title) {
      setActivePodcast(null);
    }
  };

  const handleVolumeChange = (title: string, value: number) => {
    setVolumes(prev => ({
      ...prev,
      [title]: value,
    }));
  };

  const cards = useMemo(
    () =>
      PODCASTS.map((podcast, index) => (
        <div
          key={podcast.title}
          className="bg-gray-100 border-2 border-primary rounded-2xl shadow-sm p-5 flex flex-col space-y-4 relative"
        >
          <div className="bg-[#5f3dd4] text-white px-4 py-2 rounded-xl text-lg font-semibold font-display shadow">
            {podcast.title}
          </div>
          <p className="text-sm text-gray-800 leading-relaxed font-body">{podcast.description}</p>
          <div className="flex items-center justify-center space-x-3 pt-2">
            <button
              className={`play-button relative p-3 rounded-full text-white shadow transition ${
                activePodcast === podcast.title
                  ? 'bg-[#2ABF90] playing'
                  : 'bg-[#2ABF90] hover:opacity-90'
              }`}
              onClick={() => handlePlay(podcast.title)}
              aria-label={`Play ${podcast.title}`}
            >
              ▶
            </button>
            <button
              className="p-3 rounded-full border border-primary text-primary hover:bg-primary/10 transition"
              onClick={() => handlePause(podcast.title)}
              aria-label={`Pause ${podcast.title}`}
            >
              ⏸
            </button>
          </div>
          <div className="pt-2">
            <div className="h-1.5 bg-[#e5e9ff] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#4D5BFF] transition-all duration-300"
                style={{ width: `${progress[podcast.title] ?? 0}%` }}
              />
            </div>
          </div>
          <div
            className="absolute inset-0 pointer-events-none opacity-0"
            aria-hidden="true"
            dangerouslySetInnerHTML={{
              __html: podcast.iframe.replace('<iframe', `<iframe id="podcast-iframe-${index}"`),
            }}
          />
          <div className="pt-1">
            <div className="flex items-center space-x-3 text-xs text-gray-600 group">
              <span className="speaker-icon text-black">🔊</span>
              <div className="relative w-1/4 min-w-[90px]">
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={volumes[podcast.title] ?? 80}
                  onChange={(event) => handleVolumeChange(podcast.title, Number(event.target.value))}
                  className="volume-slider w-full"
                />
                <span className="absolute -top-6 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity pointer-events-none">
                  {volumes[podcast.title] ?? 80}%
                </span>
              </div>
            </div>
          </div>
        </div>
      )),
    [activePodcast, volumes, progress],
  );

  return (
    <div className="h-full bg-white shadow-2xl border-l border-gray-200 flex flex-col">
      <style>{glowStyle}</style>
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-[#5a3bcf] via-[#7b4df1] to-[#ffc266] text-white">
        <div>
          <h2 className="text-2xl font-bold font-display">Podcasts – Learn German conversations and culture on the go</h2>
          <p className="text-sm text-white/80">Curated audio lessons to sharpen your listening skills.</p>
        </div>
        <button
          onClick={handleClose}
          className="bg-white/15 hover:bg-white/25 transition rounded-full p-2 text-white"
        >
          ✕
        </button>
      </div>

      <div className="p-6 overflow-y-auto flex-1" style={{ background: 'linear-gradient(135deg, #faf9ff 0%, #f5f5f5 100%)' }}>
        <div className="grid gap-6 md:grid-cols-2">
          {cards}
        </div>
      </div>
    </div>
  );
};

export default PodcastsPanel;