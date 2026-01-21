import { createPathComponent } from "@react-leaflet/core";
import L from "leaflet";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";

const MarkerClusterGroup = createPathComponent(({ children: _c, ...props }, ctx) => {
    const clusterProps = {
        ...props,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
        removeOutsideVisibleBounds: true,
    };

    const markerClusterGroup = new L.MarkerClusterGroup(clusterProps);

    return {
        instance: markerClusterGroup,
        context: { ...ctx, layerContainer: markerClusterGroup },
    };
});

export default MarkerClusterGroup;
