import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { logEvent } from 'firebase/analytics';
import { analytics } from '../config/firebase';

const GoogleAnalytics = () => {
    const location = useLocation();

    useEffect(() => {
        logEvent(analytics, 'page_view', {
            page_path: location.pathname + location.search,
            page_title: document.title
        });
        console.log("GA: Page View", location.pathname);
    }, [location]);

    return null;
};

export default GoogleAnalytics;
