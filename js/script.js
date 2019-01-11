mapboxgl.accessToken =
    "pk.eyJ1IjoiYnJhZGxleTIzODciLCJhIjoiY2pnMTk0ZTk2NmJzOTJxbnZpMjl1ZGsxbiJ9.L-BSY_VjUrkHL3ov0OciKQ";
var map = new mapboxgl.Map({
    container: "map", // container id
    // style: 'mapbox://styles/mapbox/dark-v9', //hosted style id
    // style: 'mapbox://styles/mapbox/satellite-streets-v9', //hosted style id
    style: "style.json",
    center: [-73.5851, 41.9816], // starting position
    zoom: 7, // starting zoom
    hash: true,
    doubleClickZoom: false,
});

var ajaxresult;
$.getJSON("/allcamps.json", function (data) {
    ajaxresult = data;
    console.log("Camps Ajax'd");
});
// Add zoom and rotation controls to the map.
map.addControl(new mapboxgl.NavigationControl());
var Draw = new MapboxDraw({
    displayControlsDefault: false,
    controls: {
        polygon: true,
        trash: true
    },
});
map.addControl(Draw);

var layerList = document.getElementById("changebasemap");
var inputs = layerList.getElementsByTagName("input");

function switchLayer(layer) {
    var layerId = layer.target.id;
    if (layerId === "mystyle") {
        map.setStyle("style.json");
    } else {
        map.setStyle("mapbox://styles/mapbox/" + layerId + "-v9");
    }
}
for (var i = 0; i < inputs.length; i++) {
    inputs[i].onclick = switchLayer;
}
$(".showpanelbtn").click(function (e) {
    $("#map").width("75%");
    $("#sidepanel").show();
    $('.showpanelbtn').hide();
    $('.hidepanelbtn').show();
    map.resize();
});
$(".hidepanelbtn").click(function (e) {
    $("#map").width("100%");
    $("#sidepanel").hide();
    $('.showpanelbtn').show();
    $('.hidepanelbtn').hide();
    map.resize();
});
map.on("style.load", function () {
    var layers = map.getStyle().layers;
    // Find the index of the first symbol layer in the map style
    var firstSymbolId;
    for (var i = 0; i < layers.length; i++) {
        if (layers[i].type === "symbol") {
            firstSymbolId = layers[i].id;
            break;
        }
    }
    // map.addSource("allcamps", {
    //     type: "vector",
    //     tiles: [
    //         "http://www.jeffreybradley.a2hosted.com:49500/allcamps/{z}/{x}/{y}.pbf"
    //     ],
    //     minzoom: 0,
    //     maxzoom: 6
    // });
    map.addSource("allcamps", {
        type: "geojson",
        data: "/allcamps.json",
    });
    map.addSource("alltrails", {
        type: "vector",
        tiles: [
            "http://www.jeffreybradley.a2hosted.com:49500/alltrails/{z}/{x}/{y}.pbf"
        ],
        minzoom: 0,
        maxzoom: 13
    });

    map.addLayer({
        id: "allcamps",
        type: "circle",
        source: "allcamps",
        // "source-layer": "allcamps",
        minzoom: 4,
        maxzoom: 22,
        layout: {
            visibility: "visible"
        },
        paint: {
            "circle-color": "blue",
            "circle-radius": {
                base: 1.75,
                stops: [
                    [7, 1],
                    [14, 3],
                    [22, 19]
                ]
            }
        }
    }, firstSymbolId);
    map.addLayer({
        id: "allcampslabels",
        type: "symbol",
        source: "allcamps",
        // "source-layer": "allcamps",
        minzoom: 9,
        maxzoom: 22,
        layout: {
            visibility: "visible",
            "text-field": "{name}",
            "text-font": ["Roboto Black"],
            "text-size": {
                base: 1.75,
                stops: [
                    [8, 8],
                    [14, 14]
                ]
            },
            "text-transform": "uppercase",
            // "text-ignore-placement":true,
            // "text-allow-overlap":true
            // "text-padding": 100
        },
        paint: {
            "text-color": "blue",
            "text-halo-color": "#fff",
            "text-halo-width": 2
        }
    },firstSymbolId);

    map.addLayer({
        id: "allcampslabels_highlight",
        type: "symbol",
        source: "allcamps",
        // "source-layer": "allcamps",
        minzoom: 4,
        maxzoom: 22,
        layout: {
            visibility: "visible",
            "text-field": "{name}",
            "text-font": ["Roboto Black"],
            "text-size": {
                base: 1.75,
                stops: [
                    [8, 12],
                    [14, 18]
                ]
            },
            "text-transform": "uppercase",
            "text-ignore-placement":true,
            "text-allow-overlap":true
            // "text-padding": 100
        },
        paint: {
            "text-color": "blue",
            "text-halo-color": "yellow",
            "text-halo-width": 3
        },
        filter: ["in", "id", ""]
    });

    map.addLayer({
        id: "alltrails",
        type: "line",
        source: "alltrails",
        "source-layer": "alltrails",
        minzoom: 6,
        maxzoom: 22,
        layout: {
            visibility: "visible"
        },
        paint: {
            "line-color": "red",
            "line-width": {
                base: 1.75,
                stops: [
                    [6, 0.2],
                    [15, 3]
                ]
            },
            "line-opacity": 0.8
        }
    },
        firstSymbolId
    );

    // Change the cursor to a pointer when the mouse is over the states layer.
    map.on("mouseenter", "allcampslabels", function () {
        map.getCanvas().style.cursor = "pointer";
    });

    // Change it back to a pointer when it leaves.
    map.on("mouseleave", "allcampslabels", function () {
        map.getCanvas().style.cursor = "";
    });
});

var draw_mode;
map.on("mousemove", function () {
    handleMeasurement();
});
map.on("draw.create", function () {
    handleMeasurement();
});
map.on("draw.update", function () {
    handleMeasurement();
});
map.on('draw.delete', function () {
    Draw.deleteAll();
});
var geomdata;

function handleMeasurement() {
    $(".calculation-box").css("display", "block");
    // should log both metric and standard display strings for the current drawn feature
    const features = Draw.getAll().features;
    if (features.length > 0) {
        geomdata = features[0].geometry;
        const feature = features[0];
        // metric calculation
        const drawnLength = turf.length(feature) * 1000; // meters
        const drawnArea = turf.area(feature); // square meters

        let metricUnits = "m";
        let metricFormat = "0,0";
        let metricMeasurement;

        let standardUnits = "feet";
        let standardFormat = "0,0";
        let standardMeasurement;

        if (drawnLength > drawnArea) {
            // user is drawing a line
            metricMeasurement = drawnLength;
            if (drawnLength >= 1000) {
                // if over 1000 meters, upgrade metric
                metricMeasurement = drawnLength / 1000;
                metricUnits = "km";
                metricFormat = "0.00";
            }

            standardMeasurement = drawnLength * 3.28084;
            if (standardMeasurement >= 5280) {
                // if over 5280 feet, upgrade standard
                standardMeasurement /= 5280;
                standardUnits = "mi";
                standardFormat = "0.00";
            }
        } else {
            // user is drawing a polygon
            metricUnits = "m²";
            metricMeasurement = drawnArea;
            metricFormat = "0,0";

            standardUnits = "ft²";
            standardFormat = "0,0";
            standardMeasurement = drawnArea * 10.7639;

            if (drawnArea >= 1000000) {
                // if over 1,000,000 meters, upgrade metric
                metricMeasurement = drawnArea / 1000000;
                metricUnits = "km²";
                metricFormat = "0.00";
            }

            if (standardMeasurement >= 27878400) {
                // if over 27878400 sf, upgrade standard
                standardMeasurement /= 27878400;
                standardUnits = "mi²";
                standardFormat = "0.00";
            }
        }

        const drawnMeasurements = {
            metric: `${numeral(metricMeasurement).format(metricFormat)} ${metricUnits}`,
            standard: `${numeral(standardMeasurement).format(standardFormat)} ${standardUnits}`
        };
        $("#calculated-area").html(`${drawnMeasurements.standard}<br>
      ${drawnMeasurements.metric} `);
    }
}

var campsearchbtn = $("#campsearch").on("keyup", function () {
    if (this.value.length < 3) return;
    $("#result").html("");

    var campsearch = $("#campsearch").val();
    var expression = new RegExp(campsearch, "i");
    $.each(ajaxresult.features, function (key, value) {
        if (value.properties.name !== null) {
            if (value.properties.name.search(expression) !== -1) {
                $("#result").append(
                    "<li class=list-group-item>" +
                    value.properties.name +
                    "<span hidden>: " +
                    value.geometry.coordinates + "<span hidden>:" +value.properties.id+"</span>"+
                    "</span></li>"
                );
            }
        } else {
            console.log("has nulls");
        }
    });
    $("#result").on("click", "li", function (val) {
        var splitstring = $(this)[0].textContent.split(":");
        var coords = splitstring[1].split(",");
        var resultcampname = splitstring[0];
        var resultcampid=splitstring[2];
        console.log(resultcampid)
        map.setFilter("allcampslabels_highlight", [
            "in",
            "id",
            97359
        ]);
        map.jumpTo({
            center: coords,
            zoom: 14
        });
        $("#result").html("");
        setTimeout(function () {
            var features = map.querySourceFeatures("allcamps", {
                // sourceLayer: "allcamps",
                filter: ["in", "id", 97359]
            });
            console.log(features)
        }, 1000);
        $("#campsearch").val(resultcampname);
    });
});
map.on('mousemove', function (e) {
    var features = map.queryRenderedFeatures(e.point);
    document.getElementById('features').innerHTML = JSON.stringify(features, null, 2);
});
