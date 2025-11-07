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
      '<iframe width="100%" height="0" scrolling="no" frameborder="no" allow="autoplay" src="https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/soundcloud%253Atracks%253A2208497999&color=%23ff5500&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true&visual=false" style="opacity:0;pointer-events:none;"></iframe>',
  },
  {
    title: 'Wonders of Germany',
    description:
      'Explore Germany’s cultural diversity, engineering marvels, culinary delights, and educational opportunities, plus 28 must-see destinations.',
    iframe:
      '<iframe width="100%" height="0" scrolling="no" frameborder="no" allow="autoplay" src="https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/soundcloud%253Atracks%253A2207016735&color=%23ff5500&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true&visual=false" style="opacity:0;pointer-events:none;"></iframe>',
  },
  {
    title: 'German Common Phrases',
    description:
      'Master essential German phrases for everyday communication and navigate Germany with confidence.',
    iframe:
      '<iframe width="100%" height="0" scrolling="no" frameborder="no" allow="autoplay" src="https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/soundcloud%253Atracks%253A2208497996&color=%23ff5500&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true&visual=false" style="opacity:0;pointer-events:none;"></iframe>',
  },
  {
    title: 'German Work Culture',
    description:
      'Understand German work culture: work-life balance, generous leave policies, and high salaries across diverse industries.',
    iframe:
      '<iframe width="100%" height="0" scrolling="no" frameborder="no" src="https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/soundcloud%253Atracks%253A2207014527&color=%23ff5500&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true&visual=false" style="opacity:0;pointer-events:none;"></iframe>',
  },
  {
    title: 'Oktoberfest',
    description:
      'Discover the history and traditions behind Munich’s iconic folk festival, from its royal origins to today’s celebrations.',
    iframe:
      '<iframe width="100%" height="0" scrolling="no" frameborder="no" src="https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/soundcloud%253Atracks%253A2207014523&color=%23ff5500&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true&visual=false" style="opacity:0;pointer-events:none;"></iframe>',
  },
  {
    title: 'German Christmas Traditions',
    description:
      'Learn how Germany celebrates Weihnachten, from Advent Sundays to festive markets and cherished family customs.',
    iframe:
      '<iframe width="100%" height="0" scrolling="no" frameborder="no" src="https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/soundcloud%253Atracks%253A2207014519&color=%23ff5500&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true&visual=false" style="opacity:0;pointer-events:none;"></iframe>',
  },
];

const PodcastsPanel: React.FC<PodcastsPanelProps> = ({ onClose }) => {
  const widgetRefs = useRef<Record<string, any>>({});

  const handleClose = () => {
    Object.values(widgetRefs.current).forEach((widget) => widget?.pause?.());
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
            widget.pause();
          });
        }
      });
    });

    return () => {
      Object.values(widgetRefs.current).forEach((widget) => widget?.pause?.());
    };
  }, []);

  const handlePlay = (title: string) => {
    Object.entries(widgetRefs.current).forEach(([key, widget]) => {
      if (key === title) {
        widget?.play?.();
      } else {
        widget?.pause?.();
      }
    });
  };

  const handlePause = (title: string) => {
    widgetRefs.current[title]?.pause?.();
  };

  const cards = useMemo(
    () =>
      PODCASTS.map((podcast, index) => (
        <div
          key={podcast.title}
          className="bg-gray-100 border-2 border-primary rounded-2xl shadow-sm p-5 flex flex-col space-y-4 relative"
        >
          <div className="bg-primary text-white px-4 py-2 rounded-xl text-lg font-semibold font-display shadow">
            {podcast.title}
          </div>
          <p className="text-sm text-gray-800 leading-relaxed font-body">{podcast.description}</p>
          <div className="flex items-center space-x-3">
            <button
              className="btn-glossy px-4 py-2 rounded-lg text-sm font-semibold"
              onClick={() => handlePlay(podcast.title)}
            >
              Play
            </button>
            <button
              className="px-4 py-2 rounded-lg text-sm font-semibold border border-primary text-primary hover:bg-primary/10 transition"
              onClick={() => handlePause(podcast.title)}
            >
              Pause
            </button>
          </div>
          <div
            className="absolute inset-0 pointer-events-none opacity-0"
            aria-hidden="true"
            dangerouslySetInnerHTML={{
              __html: podcast.iframe.replace('<iframe', `<iframe id="podcast-iframe-${index}"`),
            }}
          />
        </div>
      )),
    [],
  );

  return (
    <div className="absolute inset-y-0 right-0 z-30 w-full lg:w-[calc(100%-380px)] bg-white shadow-2xl border-l border-gray-200 flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-primary to-indigo-500 text-white">
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

