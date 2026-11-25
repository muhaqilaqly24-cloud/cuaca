const API_BASE = "https://api.open-meteo.com/v1/forecast";
const GEO_API = "https://geocoding-api.open-meteo.com/v1/search";

const cities = [
    { name: "Jakarta", latitude: -6.2088, longitude: 106.8456 },
    { name: "Makassar", latitude: -5.1477, longitude: 119.4327 },
    { name: "Bandung", latitude: -6.9175, longitude: 107.6191 },
    { name: "Surabaya", latitude: -7.2575, longitude: 112.7521 },
    { name: "Medan", latitude: 3.5952, longitude: 98.6722 }
];

let selectedForecastCity = cities[0];

/* WEATHER DESCRIPTION */
function getWeatherInfo(code) {
    const weather = {
        0: ["Cerah", "bi-sun-fill"],
        1: ["Cerah Berawan", "bi-cloud-sun-fill"],
        2: ["Berawan Sebagian", "bi-cloud-sun-fill"],
        3: ["Berawan", "bi-cloud-fill"],
        45: ["Berkabut", "bi-cloud-fog-fill"],
        48: ["Kabut Tebal", "bi-cloud-fog-fill"],
        51: ["Gerimis Ringan", "bi-cloud-drizzle-fill"],
        53: ["Gerimis", "bi-cloud-drizzle-fill"],
        55: ["Gerimis Lebat", "bi-cloud-drizzle-fill"],
        61: ["Hujan Ringan", "bi-cloud-rain-fill"],
        63: ["Hujan", "bi-cloud-rain-fill"],
        65: ["Hujan Lebat", "bi-cloud-rain-heavy-fill"],
        71: ["Salju Ringan", "bi-cloud-snow-fill"],
        73: ["Salju", "bi-cloud-snow-fill"],
        75: ["Salju Lebat", "bi-cloud-snow-fill"],
        80: ["Hujan Lokal", "bi-cloud-rain-fill"],
        81: ["Hujan Lokal", "bi-cloud-rain-fill"],
        82: ["Hujan Lebat", "bi-cloud-rain-heavy-fill"],
        95: ["Badai Petir", "bi-cloud-lightning-rain-fill"],
        96: ["Badai Petir", "bi-cloud-lightning-rain-fill"],
        99: ["Badai Petir", "bi-cloud-lightning-rain-fill"]
    };

    return weather[code] || ["Tidak diketahui", "bi-cloud"];
}

/* FORMAT DATE */
function formatDate(dateString, options = {}) {
    return new Date(dateString + "T12:00:00").toLocaleDateString(
        "id-ID",
        options
    );
}

/* FETCH WEATHER */
async function getWeather(latitude, longitude) {
    const params = new URLSearchParams({
        latitude,
        longitude,
        current: [
            "temperature_2m",
            "relative_humidity_2m",
            "apparent_temperature",
            "is_day",
            "precipitation",
            "weather_code",
            "pressure_msl",
            "wind_speed_10m"
        ].join(","),
        daily: [
            "weather_code",
            "temperature_2m_max",
            "temperature_2m_min",
            "precipitation_probability_max"
        ].join(","),
        timezone: "auto",
        forecast_days: 5
    });

    const response = await fetch(`${API_BASE}?${params}`);

    if (!response.ok) {
        throw new Error("Gagal mengambil data cuaca.");
    }

    return await response.json();
}

/* CITY WEATHER CARD */
function createWeatherCard(city, data) {
    const current = data.current;
    const info = getWeatherInfo(current.weather_code);

    return `
        <div class="col-md-6 col-lg-4 col-xl">
            <div class="weather-card">
                <div class="weather-city">${city.name}</div>

                <div class="text-muted small">
                    <i class="bi bi-geo-alt"></i>
                    Indonesia
                </div>

                <div class="weather-icon">
                    <i class="bi ${info[1]}"></i>
                </div>

                <div class="temperature">
                    ${Math.round(current.temperature_2m)}°C
                </div>

                <div class="weather-desc">${info[0]}</div>

                <div class="weather-detail">
                    <span><i class="bi bi-droplet"></i> Kelembapan</span>
                    <strong>${current.relative_humidity_2m}%</strong>
                </div>

                <div class="weather-detail">
                    <span><i class="bi bi-wind"></i> Angin</span>
                    <strong>${current.wind_speed_10m} km/j</strong>
                </div>
            </div>
        </div>
    `;
}

/* LOAD ALL CITIES */
async function loadAllCities() {
    const container = document.getElementById("weatherCities");

    container.innerHTML = `
        <div class="col-12 loading">
            <i class="bi bi-arrow-repeat"></i>
            <p>Memperbarui data cuaca...</p>
        </div>
    `;

    const results = await Promise.allSettled(
        cities.map(async city => ({
            city,
            data: await getWeather(city.latitude, city.longitude)
        }))
    );

    const successful = results.filter(
        result => result.status === "fulfilled"
    );

    container.innerHTML = successful.map(result =>
        createWeatherCard(result.value.city, result.value.data)
    ).join("");

    if (!successful.length) {
        container.innerHTML = `
            <div class="col-12 text-center text-danger">
                Data cuaca tidak dapat dimuat. Periksa koneksi internet.
            </div>
        `;
    }

    const now = new Date();

    document.getElementById("lastUpdated").textContent =
        "Diperbarui " + now.toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit"
        });

    if (successful.length) {
        const main = successful[0].value.data.current;

        document.getElementById("detailHumidity").textContent =
            main.relative_humidity_2m + "%";

        document.getElementById("detailWind").textContent =
            main.wind_speed_10m + " km/j";

        document.getElementById("detailPressure").textContent =
            Math.round(main.pressure_msl) + " hPa";

        document.getElementById("detailTemperature").textContent =
            Math.round(main.temperature_2m) + "°C";
    }
}

/* SEARCH CITY */
async function searchCity() {
    const input = document.getElementById("cityInput");
    const message = document.getElementById("searchMessage");
    const resultBox = document.getElementById("searchResult");
    const content = document.getElementById("searchWeatherContent");

    const cityName = input.value.trim();

    if (!cityName) {
        message.textContent = "Masukkan nama kota terlebih dahulu.";
        return;
    }

    message.textContent = "Sedang mencari data kota...";
    resultBox.classList.remove("show");

    try {
        const params = new URLSearchParams({
            name: cityName,
            count: 1,
            language: "id",
            format: "json"
        });

        const response = await fetch(`${GEO_API}?${params}`);
        const geoData = await response.json();

        if (!geoData.results || geoData.results.length === 0) {
            throw new Error("Kota tidak ditemukan.");
        }

        const location = geoData.results[0];
        const data = await getWeather(location.latitude, location.longitude);
        const current = data.current;
        const info = getWeatherInfo(current.weather_code);

        content.innerHTML = `
            <div class="row align-items-center">
                <div class="col-md-7">
                    <h3 class="fw-bold">${location.name}</h3>
                    <p class="text-muted">
                        ${location.admin1 || ""}
                        ${location.country || ""}
                    </p>
                    <div class="temperature">
                        ${Math.round(current.temperature_2m)}°C
                    </div>
                    <p class="text-muted">${info[0]}</p>
                </div>

                <div class="col-md-5 text-md-end">
                    <i class="bi ${info[1]} weather-icon"></i>
                    <p>
                        Terasa seperti
                        <strong>${current.apparent_temperature}°C</strong>
                    </p>
                    <p>
                        Kelembapan:
                        <strong>${current.relative_humidity_2m}%</strong>
                    </p>
                    <p>
                        Angin:
                        <strong>${current.wind_speed_10m} km/j</strong>
                    </p>
                </div>
            </div>
        `;

        resultBox.classList.add("show");
        message.textContent = "Hasil pencarian berhasil ditemukan.";

        selectedForecastCity = {
            name: location.name,
            latitude: location.latitude,
            longitude: location.longitude
        };

        loadForecast(selectedForecastCity);

        document.getElementById("forecastCity").value =
            cities.some(city => city.name.toLowerCase() === location.name.toLowerCase())
                ? location.name
                : "";

    } catch (error) {
        message.textContent = error.message;
    }
}

/* LOAD FORECAST */
async function loadForecast(city) {
    const container = document.getElementById("forecastContainer");

    container.innerHTML = `
        <div class="col-12 loading">
            <i class="bi bi-arrow-repeat"></i>
            <p>Memuat prakiraan cuaca...</p>
        </div>
    `;

    try {
        const data = await getWeather(city.latitude, city.longitude);
        const daily = data.daily;

        container.innerHTML = daily.time.map((date, index) => {
            const info = getWeatherInfo(daily.weather_code[index]);
            const max = Math.round(daily.temperature_2m_max[index]);
            const min = Math.round(daily.temperature_2m_min[index]);
            const rain = daily.precipitation_probability_max[index];

            return `
                <div class="col-6 col-md">
                    <div class="forecast-card">
                        <div class="forecast-day">
                            ${index === 0 ? "Hari Ini" : formatDate(date, {
                                weekday: "short"
                            })}
                        </div>

                        <div class="forecast-icon">
                            <i class="bi ${info[1]}"></i>
                        </div>

                        <div class="forecast-desc">${info[0]}</div>

                        <div class="forecast-temp mt-2">
                            ${max}° / ${min}°
                        </div>

                        <small class="text-muted d-block mt-2">
                            <i class="bi bi-droplet"></i>
                            ${rain ?? "--"}%
                        </small>
                    </div>
                </div>
            `;
        }).join("");

    } catch (error) {
        container.innerHTML = `
            <div class="col-12 text-center text-danger">
                Gagal memuat prakiraan cuaca.
            </div>
        `;
    }
}

/* SEARCH EVENTS */
document.getElementById("searchButton").addEventListener("click", searchCity);

document.getElementById("cityInput").addEventListener("keydown", event => {
    if (event.key === "Enter") {
        searchCity();
    }
});

/* FORECAST SELECT */
document.getElementById("forecastCity").addEventListener("change", event => {
    const city = cities.find(item => item.name === event.target.value);

    if (city) {
        selectedForecastCity = city;
        loadForecast(city);
    }
});

/* SCROLLSPY */
function initializeScrollSpy() {
    const navbar = document.getElementById("mainNavbar");

    const links = [
        ...navbar.querySelectorAll('.nav-link[href^="#"]')
    ];

    const entries = links.map(link => {
        const target = document.querySelector(link.getAttribute("href"));

        return target ? { target, link } : null;
    }).filter(Boolean);

    if (!entries.length) return;

    function updateActiveMenu() {
        const marker = window.scrollY + navbar.offsetHeight + 120;
        let active = entries[0];

        for (const entry of entries) {
            if (entry.target.offsetTop <= marker) {
                active = entry;
            }
        }

        if (
            window.innerHeight + window.scrollY >=
            document.documentElement.scrollHeight - 5
        ) {
            active = entries[entries.length - 1];
        }

        entries.forEach(entry => {
            const isActive = entry.link === active.link;

            entry.link.classList.toggle("active", isActive);

            if (isActive) {
                entry.link.setAttribute("aria-current", "page");
            } else {
                entry.link.removeAttribute("aria-current");
            }
        });
    }

    let ticking = false;

    window.addEventListener("scroll", () => {
        if (ticking) return;

        ticking = true;

        requestAnimationFrame(() => {
            updateActiveMenu();
            ticking = false;
        });
    }, { passive: true });

    window.addEventListener("resize", updateActiveMenu);
    window.addEventListener("load", updateActiveMenu);

    updateActiveMenu();
}

/* PARALLAX */
function initializeParallax() {
    const hero = document.querySelector(".hero");

    if (!hero) return;

    const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    ).matches;

    if (reduceMotion || window.innerWidth <= 991) return;

    let ticking = false;

    window.addEventListener("scroll", () => {
        if (ticking) return;

        ticking = true;

        requestAnimationFrame(() => {
            const scrollPosition = window.scrollY;

            if (scrollPosition < hero.offsetHeight) {
                hero.style.backgroundPositionY =
                    `${50 + scrollPosition * 0.12}%`;
            }

            ticking = false;
        });
    }, { passive: true });
}

/* TYPEWRITER */
function initializeTyping() {
    const element = document.getElementById("typingText");

    if (!element) return;

    const words = [
        "Jelajahi Cuaca.",
        "Pantau Suhu Udara.",
        "Kenali Prakiraan.",
        "Rencanakan Aktivitas."
    ];

    let wordIndex = 0;
    let charIndex = words[0].length;
    let deleting = false;

    function type() {
        const word = words[wordIndex];

        if (deleting) {
            charIndex--;
        } else {
            charIndex++;
        }

        element.textContent = word.substring(0, charIndex);

        let speed = deleting ? 45 : 85;

        if (!deleting && charIndex === word.length) {
            deleting = true;
            speed = 1500;
        } else if (deleting && charIndex === 0) {
            deleting = false;
            wordIndex = (wordIndex + 1) % words.length;
            speed = 300;
        }

        setTimeout(type, speed);
    }

    setTimeout(type, 1800);
}

/* REVEAL ANIMATION */
function initializeReveal() {
    const elements = document.querySelectorAll(".reveal");

    if (!("IntersectionObserver" in window)) {
        elements.forEach(element => element.classList.add("active"));
        return;
    }

    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add("active");
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.12
    });

    elements.forEach(element => observer.observe(element));
}

/* SCROLL EVENTS */
function initializeScrollEvents() {
    const navbar = document.getElementById("mainNavbar");
    const backToTop = document.getElementById("backToTop");

    window.addEventListener("scroll", () => {
        navbar.classList.toggle("scrolled", window.scrollY > 50);
        backToTop.classList.toggle("show", window.scrollY > 400);
    }, { passive: true });

    backToTop.addEventListener("click", () => {
        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    });
}

/* CONTACT FORM */
function initializeContactForm() {
    const form = document.getElementById("contactForm");

    form.addEventListener("submit", event => {
        event.preventDefault();

        showToast("Terima kasih! Pesan kamu berhasil dikirim.");

        form.reset();
    });
}

/* TOAST */
function showToast(message) {
    document.getElementById("toastMessage").textContent = message;

    const toastElement = document.getElementById("messageToast");
    const toast = bootstrap.Toast.getOrCreateInstance(toastElement);

    toast.show();
}

/* INITIALIZE */
async function initializeWebsite() {
    initializeScrollSpy();
    initializeParallax();
    initializeTyping();
    initializeReveal();
    initializeScrollEvents();
    initializeContactForm();

    await loadAllCities();
    await loadForecast(cities[0]);

    /* Update data otomatis setiap 10 menit */
    setInterval(() => {
        loadAllCities();
        loadForecast(selectedForecastCity);
    }, 600000);
}

document.addEventListener("DOMContentLoaded", initializeWebsite);