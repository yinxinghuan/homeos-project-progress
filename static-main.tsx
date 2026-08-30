import React from 'react';
import { createRoot } from 'react-dom/client';

import { ProgressOverview } from './app/page';
import { ProgressItemPage } from './components/progress-item-page';
import { data } from './lib/progress';
import './app/globals.css';

const root = document.getElementById('root');

if (!root) throw new Error('HomeOS root element was not found.');

const basePath = '/homeos-project-progress';
const itemMatch = window.location.pathname.match(/\/items\/([^/]+)\/?$/);
const item = itemMatch ? data.items.find((entry) => entry.id === decodeURIComponent(itemMatch[1])) : null;

createRoot(root).render(
  <React.StrictMode>
    {item ? <ProgressItemPage item={item} basePath={basePath} /> : <ProgressOverview basePath={basePath} />}
  </React.StrictMode>,
);
