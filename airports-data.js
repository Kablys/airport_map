// Ryanair European airports data
// Data compiled from Ryanair's route network as of 2024
const ryanairAirports = [
    // Ireland
    { name: "Dublin", code: "DUB", country: "Ireland", lat: 53.4213, lng: -6.2701, city: "Dublin" },
    { name: "Cork", code: "ORK", country: "Ireland", lat: 51.8413, lng: -8.4811, city: "Cork" },
    { name: "Shannon", code: "SNN", country: "Ireland", lat: 52.7019, lng: -8.9248, city: "Shannon" },
    { name: "Kerry", code: "KIR", country: "Ireland", lat: 52.1809, lng: -9.5238, city: "Kerry" },
    
    // United Kingdom
    { name: "London Stansted", code: "STN", country: "United Kingdom", lat: 51.8860, lng: 0.2389, city: "London" },
    { name: "London Luton", code: "LTN", country: "United Kingdom", lat: 51.8747, lng: -0.3683, city: "London" },
    { name: "London Gatwick", code: "LGW", country: "United Kingdom", lat: 51.1537, lng: -0.1821, city: "London" },
    { name: "Manchester", code: "MAN", country: "United Kingdom", lat: 53.3537, lng: -2.2750, city: "Manchester" },
    { name: "Birmingham", code: "BHX", country: "United Kingdom", lat: 52.4539, lng: -1.7480, city: "Birmingham" },
    { name: "Edinburgh", code: "EDI", country: "United Kingdom", lat: 55.9500, lng: -3.3725, city: "Edinburgh" },
    { name: "Glasgow", code: "GLA", country: "United Kingdom", lat: 55.8719, lng: -4.4331, city: "Glasgow" },
    { name: "Bristol", code: "BRS", country: "United Kingdom", lat: 51.3827, lng: -2.7191, city: "Bristol" },
    { name: "Liverpool", code: "LPL", country: "United Kingdom", lat: 53.3336, lng: -2.8497, city: "Liverpool" },
    { name: "Leeds Bradford", code: "LBA", country: "United Kingdom", lat: 53.8659, lng: -1.6606, city: "Leeds" },
    { name: "Newcastle", code: "NCL", country: "United Kingdom", lat: 55.0375, lng: -1.6917, city: "Newcastle" },
    { name: "Belfast International", code: "BFS", country: "United Kingdom", lat: 54.6575, lng: -6.2158, city: "Belfast" },
    
    // Spain
    { name: "Madrid Barajas", code: "MAD", country: "Spain", lat: 40.4719, lng: -3.5626, city: "Madrid" },
    { name: "Barcelona El Prat", code: "BCN", country: "Spain", lat: 41.2971, lng: 2.0785, city: "Barcelona" },
    { name: "Palma de Mallorca", code: "PMI", country: "Spain", lat: 39.5517, lng: 2.7388, city: "Palma" },
    { name: "Seville", code: "SVQ", country: "Spain", lat: 37.4180, lng: -5.8931, city: "Seville" },
    { name: "Valencia", code: "VLC", country: "Spain", lat: 39.4893, lng: -0.4816, city: "Valencia" },
    { name: "Malaga", code: "AGP", country: "Spain", lat: 36.6749, lng: -4.4991, city: "Malaga" },
    { name: "Alicante", code: "ALC", country: "Spain", lat: 38.2822, lng: -0.5581, city: "Alicante" },
    { name: "Bilbao", code: "BIO", country: "Spain", lat: 43.3011, lng: -2.9106, city: "Bilbao" },
    { name: "Santiago de Compostela", code: "SCQ", country: "Spain", lat: 42.8963, lng: -8.4151, city: "Santiago" },
    { name: "Gran Canaria", code: "LPA", country: "Spain", lat: 27.9319, lng: -15.3866, city: "Las Palmas" },
    { name: "Tenerife South", code: "TFS", country: "Spain", lat: 28.0445, lng: -16.5725, city: "Tenerife" },
    { name: "Ibiza", code: "IBZ", country: "Spain", lat: 38.8729, lng: 1.3731, city: "Ibiza" },
    { name: "Menorca", code: "MAH", country: "Spain", lat: 39.8626, lng: 4.2186, city: "Menorca" },
    { name: "Jerez", code: "XRY", country: "Spain", lat: 36.7446, lng: -6.0601, city: "Jerez" },
    { name: "Girona", code: "GRO", country: "Spain", lat: 41.9010, lng: 2.7605, city: "Girona" },
    { name: "Reus", code: "REU", country: "Spain", lat: 41.1474, lng: 1.1671, city: "Reus" },
    { name: "Santander", code: "SDR", country: "Spain", lat: 43.4270, lng: -3.8200, city: "Santander" },
    { name: "Vigo", code: "VGO", country: "Spain", lat: 42.2318, lng: -8.6277, city: "Vigo" },
    { name: "Almeria", code: "LEI", country: "Spain", lat: 36.8439, lng: -2.3701, city: "Almeria" },
    
    // Italy
    { name: "Rome Fiumicino", code: "FCO", country: "Italy", lat: 41.8003, lng: 12.2389, city: "Rome" },
    { name: "Rome Ciampino", code: "CIA", country: "Italy", lat: 41.7994, lng: 12.5949, city: "Rome" },
    { name: "Milan Malpensa", code: "MXP", country: "Italy", lat: 45.6306, lng: 8.7281, city: "Milan" },
    { name: "Milan Bergamo", code: "BGY", country: "Italy", lat: 45.6739, lng: 9.7042, city: "Milan" },
    { name: "Venice Marco Polo", code: "VCE", country: "Italy", lat: 45.5053, lng: 12.3519, city: "Venice" },
    { name: "Venice Treviso", code: "TSF", country: "Italy", lat: 45.6484, lng: 12.1944, city: "Venice" },
    { name: "Naples", code: "NAP", country: "Italy", lat: 41.2864, lng: 14.2908, city: "Naples" },
    { name: "Bologna", code: "BLQ", country: "Italy", lat: 44.5354, lng: 11.2887, city: "Bologna" },
    { name: "Turin", code: "TRN", country: "Italy", lat: 45.2008, lng: 7.6492, city: "Turin" },
    { name: "Florence", code: "FLR", country: "Italy", lat: 43.8100, lng: 11.2051, city: "Florence" },
    { name: "Pisa", code: "PSA", country: "Italy", lat: 43.6839, lng: 10.3927, city: "Pisa" },
    { name: "Bari", code: "BRI", country: "Italy", lat: 41.1389, lng: 16.7606, city: "Bari" },
    { name: "Catania", code: "CTA", country: "Italy", lat: 37.4668, lng: 15.0664, city: "Catania" },
    { name: "Palermo", code: "PMO", country: "Italy", lat: 38.1759, lng: 13.0910, city: "Palermo" },
    { name: "Cagliari", code: "CAG", country: "Italy", lat: 39.2515, lng: 9.0543, city: "Cagliari" },
    { name: "Brindisi", code: "BDS", country: "Italy", lat: 40.6576, lng: 17.9470, city: "Brindisi" },
    { name: "Pescara", code: "PSR", country: "Italy", lat: 42.4317, lng: 14.1811, city: "Pescara" },
    { name: "Ancona", code: "AOI", country: "Italy", lat: 43.6163, lng: 13.3623, city: "Ancona" },
    { name: "Rimini", code: "RMI", country: "Italy", lat: 44.0203, lng: 12.6117, city: "Rimini" },
    { name: "Verona", code: "VRN", country: "Italy", lat: 45.3957, lng: 10.8885, city: "Verona" },
    { name: "Trieste", code: "TRS", country: "Italy", lat: 45.8275, lng: 13.4722, city: "Trieste" },
    
    // Germany
    { name: "Berlin Brandenburg", code: "BER", country: "Germany", lat: 52.3667, lng: 13.5033, city: "Berlin" },
    { name: "Frankfurt Hahn", code: "HHN", country: "Germany", lat: 49.9487, lng: 7.2639, city: "Frankfurt" },
    { name: "Cologne Bonn", code: "CGN", country: "Germany", lat: 50.8659, lng: 7.1427, city: "Cologne" },
    { name: "Dusseldorf Weeze", code: "NRN", country: "Germany", lat: 51.6024, lng: 6.1421, city: "Dusseldorf" },
    { name: "Bremen", code: "BRE", country: "Germany", lat: 53.0475, lng: 8.7867, city: "Bremen" },
    { name: "Hamburg", code: "HAM", country: "Germany", lat: 53.6304, lng: 9.9882, city: "Hamburg" },
    { name: "Nuremberg", code: "NUE", country: "Germany", lat: 49.4987, lng: 11.0669, city: "Nuremberg" },
    { name: "Memmingen", code: "FMM", country: "Germany", lat: 47.9888, lng: 10.2395, city: "Memmingen" },
    { name: "Baden-Baden", code: "FKB", country: "Germany", lat: 48.7794, lng: 8.0805, city: "Baden-Baden" },
    { name: "Dortmund", code: "DTM", country: "Germany", lat: 51.5183, lng: 7.6122, city: "Dortmund" },
    { name: "Leipzig/Halle", code: "LEJ", country: "Germany", lat: 51.4324, lng: 12.2416, city: "Leipzig" },
    
    // France
    { name: "Paris Beauvais", code: "BVA", country: "France", lat: 49.4544, lng: 2.1128, city: "Paris" },
    { name: "Marseille", code: "MRS", country: "France", lat: 43.4393, lng: 5.2214, city: "Marseille" },
    { name: "Toulouse", code: "TLS", country: "France", lat: 43.6291, lng: 1.3638, city: "Toulouse" },
    { name: "Bordeaux", code: "BOD", country: "France", lat: 44.8283, lng: -0.7156, city: "Bordeaux" },
    { name: "Nice", code: "NCE", country: "France", lat: 43.6584, lng: 7.2159, city: "Nice" },
    { name: "Nantes", code: "NTE", country: "France", lat: 47.1532, lng: -1.6107, city: "Nantes" },
    { name: "Montpellier", code: "MPL", country: "France", lat: 43.5762, lng: 3.9630, city: "Montpellier" },
    { name: "Lyon", code: "LYS", country: "France", lat: 45.7256, lng: 5.0811, city: "Lyon" },
    { name: "Strasbourg", code: "SXB", country: "France", lat: 48.5384, lng: 7.6283, city: "Strasbourg" },
    { name: "Lille", code: "LIL", country: "France", lat: 50.5619, lng: 3.0895, city: "Lille" },
    { name: "La Rochelle", code: "LRH", country: "France", lat: 46.1792, lng: -1.1953, city: "La Rochelle" },
    { name: "Brest", code: "BES", country: "France", lat: 48.4479, lng: -4.4185, city: "Brest" },
    { name: "Tours", code: "TUF", country: "France", lat: 47.4322, lng: 0.7279, city: "Tours" },
    { name: "Perpignan", code: "PGF", country: "France", lat: 42.7404, lng: 2.8707, city: "Perpignan" },
    { name: "Limoges", code: "LIG", country: "France", lat: 45.8628, lng: 1.1794, city: "Limoges" },
    { name: "Poitiers", code: "PIS", country: "France", lat: 46.5877, lng: 0.3061, city: "Poitiers" },
    { name: "Carcassonne", code: "CCF", country: "France", lat: 43.2160, lng: 2.3061, city: "Carcassonne" },
    { name: "Rodez", code: "RDZ", country: "France", lat: 44.4079, lng: 2.4827, city: "Rodez" },
    
    // Netherlands
    { name: "Amsterdam Schiphol", code: "AMS", country: "Netherlands", lat: 52.3086, lng: 4.7639, city: "Amsterdam" },
    { name: "Eindhoven", code: "EIN", country: "Netherlands", lat: 51.4500, lng: 5.3747, city: "Eindhoven" },
    { name: "Maastricht", code: "MST", country: "Netherlands", lat: 50.9117, lng: 5.7703, city: "Maastricht" },
    { name: "Groningen", code: "GRQ", country: "Netherlands", lat: 53.1197, lng: 6.5794, city: "Groningen" },
    
    // Belgium
    { name: "Brussels Charleroi", code: "CRL", country: "Belgium", lat: 50.4592, lng: 4.4538, city: "Brussels" },
    { name: "Brussels Zaventem", code: "BRU", country: "Belgium", lat: 50.9014, lng: 4.4844, city: "Brussels" },
    { name: "Antwerp", code: "ANR", country: "Belgium", lat: 51.1894, lng: 4.4603, city: "Antwerp" },
    { name: "Ostend", code: "OST", country: "Belgium", lat: 51.1989, lng: 2.8622, city: "Ostend" },
    
    // Poland
    { name: "Warsaw Modlin", code: "WMI", country: "Poland", lat: 52.4511, lng: 20.6518, city: "Warsaw" },
    { name: "Krakow", code: "KRK", country: "Poland", lat: 50.0777, lng: 19.7848, city: "Krakow" },
    { name: "Gdansk", code: "GDN", country: "Poland", lat: 54.3776, lng: 18.4662, city: "Gdansk" },
    { name: "Wroclaw", code: "WRO", country: "Poland", lat: 51.1027, lng: 16.8858, city: "Wroclaw" },
    { name: "Poznan", code: "POZ", country: "Poland", lat: 52.4214, lng: 16.8262, city: "Poznan" },
    { name: "Katowice", code: "KTW", country: "Poland", lat: 50.4743, lng: 19.0800, city: "Katowice" },
    { name: "Lodz", code: "LCJ", country: "Poland", lat: 51.7219, lng: 19.3981, city: "Lodz" },
    { name: "Lublin", code: "LUZ", country: "Poland", lat: 51.2215, lng: 22.7136, city: "Lublin" },
    { name: "Rzeszow", code: "RZE", country: "Poland", lat: 50.1100, lng: 22.0190, city: "Rzeszow" },
    
    // Czech Republic
    { name: "Prague", code: "PRG", country: "Czech Republic", lat: 50.1008, lng: 14.2632, city: "Prague" },
    { name: "Brno", code: "BRQ", country: "Czech Republic", lat: 49.1513, lng: 16.6944, city: "Brno" },
    
    // Austria
    { name: "Vienna", code: "VIE", country: "Austria", lat: 48.1103, lng: 16.5697, city: "Vienna" },
    { name: "Salzburg", code: "SZG", country: "Austria", lat: 47.7933, lng: 13.0043, city: "Salzburg" },
    { name: "Graz", code: "GRZ", country: "Austria", lat: 46.9911, lng: 15.4396, city: "Graz" },
    { name: "Innsbruck", code: "INN", country: "Austria", lat: 47.2602, lng: 11.3440, city: "Innsbruck" },
    { name: "Linz", code: "LNZ", country: "Austria", lat: 48.2332, lng: 14.1875, city: "Linz" },
    { name: "Klagenfurt", code: "KLU", country: "Austria", lat: 46.6425, lng: 14.3377, city: "Klagenfurt" },
    
    // Hungary
    { name: "Budapest", code: "BUD", country: "Hungary", lat: 47.4297, lng: 19.2611, city: "Budapest" },
    { name: "Debrecen", code: "DEB", country: "Hungary", lat: 47.4889, lng: 21.6153, city: "Debrecen" },
    
    // Portugal
    { name: "Lisbon", code: "LIS", country: "Portugal", lat: 38.7813, lng: -9.1363, city: "Lisbon" },
    { name: "Porto", code: "OPO", country: "Portugal", lat: 41.2481, lng: -8.6814, city: "Porto" },
    { name: "Faro", code: "FAO", country: "Portugal", lat: 37.0144, lng: -7.9659, city: "Faro" },
    { name: "Funchal", code: "FNC", country: "Portugal", lat: 32.6978, lng: -16.7745, city: "Funchal" },
    { name: "Ponta Delgada", code: "PDL", country: "Portugal", lat: 37.7412, lng: -25.6979, city: "Ponta Delgada" },
    
    // Greece
    { name: "Athens", code: "ATH", country: "Greece", lat: 37.9364, lng: 23.9445, city: "Athens" },
    { name: "Thessaloniki", code: "SKG", country: "Greece", lat: 40.5197, lng: 22.9709, city: "Thessaloniki" },
    { name: "Rhodes", code: "RHO", country: "Greece", lat: 36.4054, lng: 28.0862, city: "Rhodes" },
    { name: "Corfu", code: "CFU", country: "Greece", lat: 39.6019, lng: 19.9117, city: "Corfu" },
    { name: "Crete Chania", code: "CHQ", country: "Greece", lat: 35.5317, lng: 24.1497, city: "Chania" },
    { name: "Crete Heraklion", code: "HER", country: "Greece", lat: 35.3387, lng: 25.1803, city: "Heraklion" },
    { name: "Santorini", code: "JTR", country: "Greece", lat: 36.3992, lng: 25.4793, city: "Santorini" },
    { name: "Mykonos", code: "JMK", country: "Greece", lat: 37.4351, lng: 25.3481, city: "Mykonos" },
    { name: "Kos", code: "KGS", country: "Greece", lat: 36.7933, lng: 27.0917, city: "Kos" },
    { name: "Zakynthos", code: "ZTH", country: "Greece", lat: 37.7509, lng: 20.8843, city: "Zakynthos" },
    { name: "Kefalonia", code: "EFL", country: "Greece", lat: 38.1201, lng: 20.5005, city: "Kefalonia" },
    { name: "Kavala", code: "KVA", country: "Greece", lat: 40.9133, lng: 24.6192, city: "Kavala" },
    { name: "Volos", code: "VOL", country: "Greece", lat: 39.2196, lng: 22.7943, city: "Volos" },
    
    // Croatia
    { name: "Zagreb", code: "ZAG", country: "Croatia", lat: 45.7429, lng: 16.0688, city: "Zagreb" },
    { name: "Split", code: "SPU", country: "Croatia", lat: 43.5389, lng: 16.2980, city: "Split" },
    { name: "Dubrovnik", code: "DBV", country: "Croatia", lat: 42.5614, lng: 18.2682, city: "Dubrovnik" },
    { name: "Pula", code: "PUY", country: "Croatia", lat: 44.8935, lng: 13.9220, city: "Pula" },
    { name: "Rijeka", code: "RJK", country: "Croatia", lat: 45.2169, lng: 14.5703, city: "Rijeka" },
    { name: "Zadar", code: "ZAD", country: "Croatia", lat: 44.1083, lng: 15.3467, city: "Zadar" },
    
    // Romania
    { name: "Bucharest Otopeni", code: "OTP", country: "Romania", lat: 44.5711, lng: 26.0850, city: "Bucharest" },
    { name: "Cluj-Napoca", code: "CLJ", country: "Romania", lat: 46.7852, lng: 23.6862, city: "Cluj-Napoca" },
    { name: "Timisoara", code: "TSR", country: "Romania", lat: 45.8099, lng: 21.3379, city: "Timisoara" },
    { name: "Iasi", code: "IAS", country: "Romania", lat: 47.1785, lng: 27.6206, city: "Iasi" },
    { name: "Sibiu", code: "SBZ", country: "Romania", lat: 45.7856, lng: 24.0913, city: "Sibiu" },
    { name: "Constanta", code: "CND", country: "Romania", lat: 44.3622, lng: 28.4883, city: "Constanta" },
    { name: "Craiova", code: "CRA", country: "Romania", lat: 44.3181, lng: 23.8878, city: "Craiova" },
    { name: "Suceava", code: "SCV", country: "Romania", lat: 47.6875, lng: 26.3540, city: "Suceava" },
    
    // Bulgaria
    { name: "Sofia", code: "SOF", country: "Bulgaria", lat: 42.6952, lng: 23.4114, city: "Sofia" },
    { name: "Plovdiv", code: "PDV", country: "Bulgaria", lat: 42.0678, lng: 24.8508, city: "Plovdiv" },
    { name: "Burgas", code: "BOJ", country: "Bulgaria", lat: 42.5695, lng: 27.5152, city: "Burgas" },
    { name: "Varna", code: "VAR", country: "Bulgaria", lat: 43.2321, lng: 27.8251, city: "Varna" },
    
    // Slovakia
    { name: "Bratislava", code: "BTS", country: "Slovakia", lat: 48.1702, lng: 17.2127, city: "Bratislava" },
    { name: "Kosice", code: "KSC", country: "Slovakia", lat: 48.6631, lng: 21.2411, city: "Kosice" },
    
    // Slovenia
    { name: "Ljubljana", code: "LJU", country: "Slovenia", lat: 46.2237, lng: 14.4576, city: "Ljubljana" },
    { name: "Maribor", code: "MBX", country: "Slovenia", lat: 46.4799, lng: 15.6861, city: "Maribor" },
    
    // Lithuania
    { name: "Vilnius", code: "VNO", country: "Lithuania", lat: 54.6341, lng: 25.2858, city: "Vilnius" },
    { name: "Kaunas", code: "KUN", country: "Lithuania", lat: 54.9639, lng: 24.0848, city: "Kaunas" },
    { name: "Palanga", code: "PLQ", country: "Lithuania", lat: 55.9733, lng: 21.0939, city: "Palanga" },
    
    // Latvia
    { name: "Riga", code: "RIX", country: "Latvia", lat: 56.9236, lng: 23.9711, city: "Riga" },
    
    // Estonia
    { name: "Tallinn", code: "TLL", country: "Estonia", lat: 59.4133, lng: 24.8328, city: "Tallinn" },
    { name: "Tartu", code: "TAY", country: "Estonia", lat: 58.3075, lng: 26.6906, city: "Tartu" },
    
    // Finland
    { name: "Helsinki", code: "HEL", country: "Finland", lat: 60.3172, lng: 24.9633, city: "Helsinki" },
    { name: "Tampere", code: "TMP", country: "Finland", lat: 61.4141, lng: 23.6044, city: "Tampere" },
    { name: "Turku", code: "TKU", country: "Finland", lat: 60.5144, lng: 22.2628, city: "Turku" },
    { name: "Lappeenranta", code: "LPP", country: "Finland", lat: 61.0446, lng: 28.1444, city: "Lappeenranta" },
    
    // Sweden
    { name: "Stockholm Arlanda", code: "ARN", country: "Sweden", lat: 59.6519, lng: 17.9186, city: "Stockholm" },
    { name: "Stockholm Skavsta", code: "NYO", country: "Sweden", lat: 58.7886, lng: 16.9122, city: "Stockholm" },
    { name: "Gothenburg", code: "GOT", country: "Sweden", lat: 57.6628, lng: 12.2798, city: "Gothenburg" },
    { name: "Malmo", code: "MMX", country: "Sweden", lat: 55.5363, lng: 13.3761, city: "Malmo" },
    { name: "Vasteras", code: "VST", country: "Sweden", lat: 59.5894, lng: 16.6336, city: "Vasteras" },
    
    // Norway
    { name: "Oslo Gardermoen", code: "OSL", country: "Norway", lat: 60.1939, lng: 11.1004, city: "Oslo" },
    { name: "Oslo Torp", code: "TRF", country: "Norway", lat: 59.1867, lng: 10.2586, city: "Oslo" },
    { name: "Bergen", code: "BGO", country: "Norway", lat: 60.2934, lng: 5.2181, city: "Bergen" },
    { name: "Stavanger", code: "SVG", country: "Norway", lat: 58.8767, lng: 5.6378, city: "Stavanger" },
    { name: "Trondheim", code: "TRD", country: "Norway", lat: 63.4578, lng: 10.9240, city: "Trondheim" },
    
    // Denmark
    { name: "Copenhagen", code: "CPH", country: "Denmark", lat: 55.6181, lng: 12.6561, city: "Copenhagen" },
    { name: "Billund", code: "BLL", country: "Denmark", lat: 55.7403, lng: 9.1522, city: "Billund" },
    { name: "Aarhus", code: "AAR", country: "Denmark", lat: 56.3000, lng: 10.6190, city: "Aarhus" },
    
    // Switzerland
    { name: "Basel", code: "BSL", country: "Switzerland", lat: 47.5896, lng: 7.5298, city: "Basel" },
    { name: "Geneva", code: "GVA", country: "Switzerland", lat: 46.2381, lng: 6.1089, city: "Geneva" },
    { name: "Zurich", code: "ZUR", country: "Switzerland", lat: 47.4647, lng: 8.5492, city: "Zurich" },
    
    // Cyprus
    { name: "Paphos", code: "PFO", country: "Cyprus", lat: 34.7118, lng: 32.4857, city: "Paphos" },
    { name: "Larnaca", code: "LCA", country: "Cyprus", lat: 34.8751, lng: 33.6249, city: "Larnaca" },
    
    // Malta
    { name: "Malta", code: "MLA", country: "Malta", lat: 35.8575, lng: 14.4775, city: "Valletta" },
    
    // Luxembourg
    { name: "Luxembourg", code: "LUX", country: "Luxembourg", lat: 49.6233, lng: 6.2044, city: "Luxembourg" },
    
    // Iceland
    { name: "Reykjavik", code: "KEF", country: "Iceland", lat: 63.9850, lng: -22.6056, city: "Reykjavik" },
    
    // Serbia
    { name: "Belgrade", code: "BEG", country: "Serbia", lat: 44.8184, lng: 20.3091, city: "Belgrade" },
    { name: "Nis", code: "INI", country: "Serbia", lat: 43.3373, lng: 21.8537, city: "Nis" },
    
    // Bosnia and Herzegovina
    { name: "Sarajevo", code: "SJJ", country: "Bosnia and Herzegovina", lat: 43.8246, lng: 18.3315, city: "Sarajevo" },
    { name: "Banja Luka", code: "BNX", country: "Bosnia and Herzegovina", lat: 44.9414, lng: 17.2975, city: "Banja Luka" },
    { name: "Tuzla", code: "TZL", country: "Bosnia and Herzegovina", lat: 44.4587, lng: 18.7248, city: "Tuzla" },
    
    // Montenegro
    { name: "Podgorica", code: "TGD", country: "Montenegro", lat: 42.3594, lng: 19.2519, city: "Podgorica" },
    { name: "Tivat", code: "TIV", country: "Montenegro", lat: 42.4047, lng: 18.7233, city: "Tivat" },
    
    // North Macedonia
    { name: "Skopje", code: "SKP", country: "North Macedonia", lat: 41.9616, lng: 21.6214, city: "Skopje" },
    { name: "Ohrid", code: "OHD", country: "North Macedonia", lat: 41.1800, lng: 20.7425, city: "Ohrid" },
    
    // Albania
    { name: "Tirana", code: "TIA", country: "Albania", lat: 41.4147, lng: 19.7206, city: "Tirana" },
    
    // Moldova
    { name: "Chisinau", code: "KIV", country: "Moldova", lat: 46.9277, lng: 28.9310, city: "Chisinau" },
    
    // Ukraine
    { name: "Kiev Boryspil", code: "KBP", country: "Ukraine", lat: 50.3450, lng: 30.8947, city: "Kiev" },
    { name: "Lviv", code: "LWO", country: "Ukraine", lat: 49.8125, lng: 23.9561, city: "Lviv" },
    { name: "Odessa", code: "ODS", country: "Ukraine", lat: 46.4268, lng: 30.6765, city: "Odessa" },
    { name: "Kharkiv", code: "HRK", country: "Ukraine", lat: 49.9248, lng: 36.2900, city: "Kharkiv" }
];

// Ryanair route connections (sample of major routes - this would be much larger in reality)
// Format: { from: "AIRPORT_CODE", to: ["CONNECTED_AIRPORT_CODES"] }
const ryanairRoutes = {
    // Major UK hubs
    "STN": ["DUB", "BCN", "MAD", "FCO", "CIA", "MXP", "BGY", "VCE", "TSF", "NAP", "BLQ", "PMI", "IBZ", "AGP", "ALC", "VLC", "BVA", "MRS", "TLS", "BOD", "NCE", "AMS", "EIN", "CRL", "BRU", "PRG", "BUD", "KRK", "GDN", "WRO", "ATH", "SKG", "CFU", "RHO", "ZAG", "SPU", "DBV", "SOF", "OTP", "LIS", "OPO", "FAO", "ARN", "NYO", "GOT", "CPH", "BLL", "OSL", "TRF", "BGO", "HEL", "RIX", "VNO", "TLL"],
    "LTN": ["DUB", "BCN", "MAD", "PMI", "AGP", "ALC", "FCO", "MXP", "VCE", "NAP", "BVA", "NCE", "MRS", "AMS", "CRL", "PRG", "KRK", "ATH", "CFU", "LIS", "FAO", "ARN", "CPH", "OSL"],
    "LGW": ["DUB", "BCN", "MAD", "PMI", "FCO", "VCE", "BVA", "AMS", "PRG", "ATH", "LIS"],
    "MAN": ["DUB", "BCN", "MAD", "PMI", "AGP", "FCO", "MXP", "VCE", "BVA", "AMS", "CRL", "PRG", "KRK", "ATH", "LIS", "FAO", "ARN", "CPH"],
    "BHX": ["DUB", "BCN", "MAD", "PMI", "FCO", "BVA", "AMS", "PRG", "ATH", "LIS"],
    "EDI": ["DUB", "BCN", "MAD", "PMI", "FCO", "BVA", "AMS", "PRG", "KRK", "ATH", "LIS", "ARN"],
    "GLA": ["DUB", "BCN", "MAD", "PMI", "FCO", "BVA", "AMS", "PRG", "ATH", "LIS"],
    "BRS": ["DUB", "BCN", "MAD", "PMI", "FCO", "BVA", "AMS", "PRG", "ATH", "LIS"],
    "LPL": ["DUB", "BCN", "MAD", "PMI", "FCO", "BVA", "AMS", "PRG", "ATH", "LIS"],
    
    // Irish hubs
    "DUB": ["STN", "LTN", "LGW", "MAN", "BHX", "EDI", "GLA", "BRS", "LPL", "LBA", "NCL", "BFS", "BCN", "MAD", "PMI", "AGP", "ALC", "VLC", "FCO", "CIA", "MXP", "BGY", "VCE", "TSF", "NAP", "BLQ", "BVA", "MRS", "TLS", "BOD", "NCE", "AMS", "EIN", "CRL", "BRU", "PRG", "BUD", "KRK", "WRO", "ATH", "SKG", "LIS", "OPO", "FAO", "ARN", "CPH", "OSL", "BER", "CGN"],
    "ORK": ["STN", "LTN", "BCN", "MAD", "PMI", "AGP", "FCO", "BVA", "AMS", "PRG", "ATH", "LIS", "FAO"],
    "SNN": ["STN", "BCN", "MAD", "AGP", "FCO", "BVA", "AMS", "ATH", "LIS"],
    
    // Spanish hubs
    "MAD": ["STN", "LTN", "LGW", "MAN", "BHX", "EDI", "GLA", "BRS", "LPL", "DUB", "ORK", "SNN", "FCO", "CIA", "MXP", "VCE", "NAP", "BVA", "TLS", "AMS", "CRL", "PRG", "BUD", "KRK", "ATH", "LIS", "OPO", "FAO", "CPH", "BER"],
    "BCN": ["STN", "LTN", "LGW", "MAN", "BHX", "EDI", "GLA", "BRS", "LPL", "DUB", "ORK", "SNN", "FCO", "CIA", "MXP", "BGY", "VCE", "TSF", "NAP", "BLQ", "BVA", "MRS", "TLS", "BOD", "NCE", "AMS", "EIN", "CRL", "BRU", "PRG", "BUD", "KRK", "WRO", "ATH", "SKG", "LIS", "OPO", "ARN", "CPH", "OSL", "BER", "CGN"],
    "PMI": ["STN", "LTN", "LGW", "MAN", "BHX", "EDI", "GLA", "BRS", "LPL", "DUB", "ORK", "SNN", "FCO", "MXP", "VCE", "NAP", "BVA", "MRS", "TLS", "BOD", "AMS", "EIN", "CRL", "PRG", "BUD", "KRK", "ATH", "LIS", "ARN", "CPH", "OSL", "BER"],
    "AGP": ["STN", "LTN", "MAN", "DUB", "ORK", "SNN", "FCO", "MXP", "BVA", "AMS", "CRL", "PRG", "KRK", "ATH", "LIS", "ARN", "CPH"],
    "ALC": ["STN", "LTN", "DUB", "FCO", "MXP", "BVA", "AMS", "CRL", "PRG", "ATH", "LIS"],
    "VLC": ["STN", "DUB", "FCO", "MXP", "BVA", "AMS", "CRL", "PRG", "ATH", "LIS"],
    "IBZ": ["STN", "FCO", "MXP", "BVA", "AMS", "CRL", "PRG", "ATH"],
    
    // Italian hubs
    "FCO": ["STN", "LTN", "LGW", "MAN", "BHX", "EDI", "GLA", "BRS", "LPL", "DUB", "ORK", "SNN", "MAD", "BCN", "PMI", "AGP", "ALC", "VLC", "IBZ", "BVA", "MRS", "AMS", "CRL", "PRG", "BUD", "KRK", "ATH", "LIS", "ARN", "CPH", "BER"],
    "CIA": ["STN", "DUB", "MAD", "BCN", "BVA", "AMS", "CRL", "PRG", "KRK", "ATH", "LIS"],
    "MXP": ["STN", "LTN", "MAN", "DUB", "MAD", "BCN", "PMI", "AGP", "ALC", "VLC", "IBZ", "BVA", "AMS", "CRL", "PRG", "BUD", "ATH", "LIS", "ARN", "CPH"],
    "BGY": ["STN", "DUB", "BCN", "BVA", "AMS", "CRL", "PRG", "KRK", "ATH", "LIS", "ARN"],
    "VCE": ["STN", "LTN", "MAN", "DUB", "MAD", "BCN", "PMI", "BVA", "AMS", "CRL", "PRG", "BUD", "KRK", "ATH", "LIS", "ARN", "CPH"],
    "TSF": ["STN", "DUB", "BCN", "BVA", "AMS", "CRL", "PRG", "ATH"],
    "NAP": ["STN", "LTN", "MAN", "DUB", "MAD", "BCN", "PMI", "BVA", "AMS", "CRL", "PRG", "ATH", "LIS"],
    "BLQ": ["STN", "DUB", "BCN", "BVA", "AMS", "CRL", "PRG", "ATH", "LIS"],
    
    // French hubs
    "BVA": ["STN", "LTN", "MAN", "BHX", "EDI", "GLA", "BRS", "LPL", "DUB", "ORK", "SNN", "MAD", "BCN", "PMI", "AGP", "ALC", "VLC", "IBZ", "FCO", "CIA", "MXP", "BGY", "VCE", "TSF", "NAP", "BLQ", "AMS", "CRL", "PRG", "BUD", "KRK", "WRO", "ATH", "LIS", "OPO", "ARN", "CPH", "OSL", "BER"],
    "MRS": ["STN", "LTN", "BCN", "PMI", "FCO", "AMS", "CRL", "PRG", "ATH", "LIS"],
    "TLS": ["STN", "DUB", "MAD", "BCN", "PMI", "AMS", "CRL", "PRG", "ATH", "LIS"],
    "BOD": ["STN", "DUB", "BCN", "PMI", "AMS", "CRL", "PRG", "ATH", "LIS"],
    "NCE": ["STN", "LTN", "DUB", "BCN", "AMS", "CRL", "PRG", "ATH"],
    
    // Dutch hubs
    "AMS": ["STN", "LTN", "LGW", "MAN", "BHX", "EDI", "GLA", "BRS", "LPL", "DUB", "ORK", "SNN", "MAD", "BCN", "PMI", "AGP", "ALC", "VLC", "IBZ", "FCO", "CIA", "MXP", "BGY", "VCE", "TSF", "NAP", "BLQ", "BVA", "MRS", "TLS", "BOD", "NCE", "CRL", "PRG", "BUD", "KRK", "WRO", "ATH", "SKG", "LIS", "OPO", "ARN", "CPH", "OSL", "BER", "CGN"],
    "EIN": ["STN", "DUB", "BCN", "PMI", "CRL", "PRG", "KRK", "ATH", "LIS"],
    
    // Belgian hubs
    "CRL": ["STN", "LTN", "MAN", "DUB", "MAD", "BCN", "PMI", "AGP", "ALC", "VLC", "IBZ", "FCO", "CIA", "MXP", "BGY", "VCE", "TSF", "NAP", "BLQ", "BVA", "MRS", "TLS", "BOD", "AMS", "EIN", "PRG", "BUD", "KRK", "WRO", "ATH", "SKG", "LIS", "OPO", "ARN", "CPH", "OSL", "BER"],
    "BRU": ["STN", "DUB", "BCN", "AMS", "PRG", "ATH", "LIS"],
    
    // German hubs
    "BER": ["STN", "DUB", "MAD", "BCN", "PMI", "FCO", "BVA", "AMS", "CRL", "PRG", "KRK", "ATH", "LIS", "ARN", "CPH"],
    "CGN": ["STN", "DUB", "BCN", "AMS", "CRL", "PRG", "ATH", "LIS"],
    
    // Czech hub
    "PRG": ["STN", "LTN", "LGW", "MAN", "BHX", "EDI", "GLA", "BRS", "LPL", "DUB", "ORK", "SNN", "MAD", "BCN", "PMI", "AGP", "ALC", "VLC", "IBZ", "FCO", "CIA", "MXP", "BGY", "VCE", "TSF", "NAP", "BLQ", "BVA", "MRS", "TLS", "BOD", "NCE", "AMS", "EIN", "CRL", "BRU", "BUD", "KRK", "WRO", "ATH", "SKG", "LIS", "OPO", "ARN", "CPH", "OSL", "BER", "CGN"],
    
    // Hungarian hub
    "BUD": ["STN", "DUB", "MAD", "BCN", "PMI", "FCO", "MXP", "VCE", "BVA", "AMS", "CRL", "PRG", "KRK", "ATH", "LIS", "ARN", "CPH"],
    
    // Polish hubs
    "KRK": ["STN", "LTN", "MAN", "DUB", "MAD", "BCN", "PMI", "AGP", "FCO", "CIA", "MXP", "BGY", "VCE", "BVA", "AMS", "EIN", "CRL", "PRG", "BUD", "ATH", "LIS", "ARN", "CPH", "BER"],
    "GDN": ["STN", "DUB", "AMS", "CRL", "PRG", "ATH", "LIS"],
    "WRO": ["STN", "DUB", "BCN", "BVA", "AMS", "CRL", "PRG", "ATH", "LIS"],
    
    // Greek hubs
    "ATH": ["STN", "LTN", "LGW", "MAN", "BHX", "EDI", "GLA", "BRS", "LPL", "DUB", "ORK", "SNN", "MAD", "BCN", "PMI", "AGP", "ALC", "VLC", "IBZ", "FCO", "CIA", "MXP", "VCE", "TSF", "NAP", "BLQ", "BVA", "MRS", "TLS", "BOD", "NCE", "AMS", "CRL", "BRU", "PRG", "BUD", "KRK", "GDN", "WRO", "SKG", "CFU", "RHO", "LIS", "OPO", "ARN", "CPH", "OSL", "BER", "CGN"],
    "SKG": ["STN", "DUB", "BCN", "AMS", "CRL", "PRG", "ATH", "LIS"],
    "CFU": ["STN", "LTN", "ATH", "LIS"],
    "RHO": ["STN", "ATH", "LIS"],
    
    // Portuguese hubs
    "LIS": ["STN", "LTN", "LGW", "MAN", "BHX", "EDI", "GLA", "BRS", "LPL", "DUB", "ORK", "SNN", "MAD", "BCN", "PMI", "AGP", "ALC", "VLC", "FCO", "CIA", "MXP", "BGY", "VCE", "NAP", "BLQ", "BVA", "MRS", "TLS", "BOD", "AMS", "EIN", "CRL", "BRU", "PRG", "BUD", "KRK", "GDN", "WRO", "ATH", "SKG", "CFU", "RHO", "OPO", "FAO", "ARN", "CPH", "OSL", "BER", "CGN"],
    "OPO": ["DUB", "MAD", "BCN", "BVA", "AMS", "CRL", "PRG", "ATH", "LIS", "ARN"],
    "FAO": ["STN", "LTN", "MAN", "DUB", "ORK", "SNN", "MAD", "LIS", "ARN"],
    
    // Scandinavian hubs
    "ARN": ["STN", "LTN", "MAN", "EDI", "DUB", "BCN", "PMI", "AGP", "FCO", "MXP", "BGY", "VCE", "BVA", "AMS", "CRL", "PRG", "BUD", "KRK", "ATH", "LIS", "OPO", "FAO", "CPH", "OSL"],
    "NYO": ["STN", "DUB", "AMS", "CRL", "PRG", "ATH"],
    "GOT": ["STN", "AMS", "CRL", "PRG", "ATH"],
    "CPH": ["STN", "LTN", "MAN", "DUB", "MAD", "BCN", "PMI", "AGP", "FCO", "MXP", "VCE", "BVA", "AMS", "CRL", "PRG", "BUD", "KRK", "ATH", "LIS", "ARN", "OSL", "BER"],
    "BLL": ["STN", "AMS", "CRL", "PRG"],
    "OSL": ["STN", "LTN", "MAN", "DUB", "BCN", "PMI", "BVA", "AMS", "CRL", "PRG", "ATH", "LIS", "ARN", "CPH"],
    "TRF": ["STN", "AMS", "CRL", "PRG"],
    "BGO": ["STN", "AMS", "CRL", "PRG"],
    
    // Finnish hubs
    "HEL": ["STN", "AMS", "CRL", "PRG", "ATH", "BER", "ARN", "CPH"],
    "TMP": ["BER", "AMS", "CRL", "PRG"],
    "TKU": ["BER", "AMS", "CRL"],
    "LPP": ["BER", "AMS", "CRL"],
    
    // Baltic hubs
    "RIX": ["STN", "AMS", "CRL", "PRG", "ATH", "BER", "ARN", "CPH", "OSL", "DUB", "BCN", "FCO", "BVA"],
    "VNO": ["STN", "AMS", "CRL", "PRG", "ATH", "BER", "ARN", "CPH", "DUB", "BCN", "FCO", "BVA", "KUN", "RIX"],
    "TLL": ["STN", "AMS", "CRL", "PRG", "ATH", "BER", "ARN", "CPH", "DUB", "BCN", "FCO", "BVA", "RIX", "VNO"],
    
    // Lithuanian hubs (including Kaunas!)
    "KUN": ["STN", "LTN", "DUB", "BVA", "AMS", "CRL", "PRG", "BER", "ATH", "FCO", "BCN", "MAD", "VNO", "RIX", "TLL", "ARN", "CPH", "OSL", "BGO", "LIS", "MXP", "BGY", "NAP", "PMI", "AGP", "KRK", "BUD", "SOF", "OTP"],
    "PLQ": ["BER", "AMS", "CRL", "PRG", "VNO", "RIX"],
    
    // Estonian hub
    "TAY": ["BER", "AMS", "CRL", "VNO", "RIX"],
    
    // Romanian hubs
    "OTP": ["STN", "AMS", "CRL", "PRG", "ATH", "LIS", "BER", "FCO", "BCN", "MAD", "BVA", "DUB", "KUN", "CLJ", "TSR", "IAS", "SBZ"],
    "CLJ": ["STN", "AMS", "CRL", "PRG", "ATH", "BER", "FCO", "BCN", "DUB", "BVA", "OTP", "TSR"],
    "TSR": ["STN", "AMS", "CRL", "PRG", "BER", "FCO", "BCN", "DUB", "BVA", "OTP", "CLJ", "BUD"],
    "IAS": ["STN", "AMS", "CRL", "PRG", "BER", "OTP", "BVA"],
    "SBZ": ["STN", "AMS", "CRL", "PRG", "BER", "OTP", "BVA"],
    "CND": ["AMS", "CRL", "PRG", "BER", "OTP"],
    "CRA": ["AMS", "CRL", "PRG", "BER", "OTP"],
    "SCV": ["AMS", "CRL", "PRG", "BER", "OTP"],
    
    // Bulgarian hubs
    "SOF": ["STN", "AMS", "CRL", "PRG", "ATH", "LIS", "BER", "FCO", "BCN", "MAD", "BVA", "DUB", "KUN", "PDV", "BOJ", "VAR"],
    "PDV": ["AMS", "CRL", "PRG", "BER", "SOF", "ATH"],
    "BOJ": ["AMS", "CRL", "PRG", "BER", "SOF", "ATH", "FCO"],
    "VAR": ["AMS", "CRL", "PRG", "BER", "SOF", "ATH", "FCO"],
    
    // Slovak hubs
    "BTS": ["STN", "AMS", "CRL", "PRG", "ATH", "BER", "FCO", "BCN", "DUB", "BVA", "KSC"],
    "KSC": ["AMS", "CRL", "PRG", "BER", "BTS", "ATH"],
    
    // Slovenian hubs
    "LJU": ["STN", "AMS", "CRL", "PRG", "BER", "FCO", "BCN", "DUB", "BVA", "MBX"],
    "MBX": ["AMS", "CRL", "PRG", "BER", "LJU"],
    
    // Swiss hubs
    "BSL": ["STN", "AMS", "CRL", "PRG", "BER", "FCO", "BCN", "MAD", "DUB", "BVA", "GVA", "ZUR"],
    "GVA": ["STN", "AMS", "CRL", "PRG", "BER", "FCO", "BCN", "MAD", "DUB", "BVA", "BSL"],
    "ZUR": ["STN", "AMS", "CRL", "PRG", "BER", "FCO", "BCN", "DUB", "BVA", "BSL"],
    
    // Austrian hubs
    "VIE": ["STN", "AMS", "CRL", "PRG", "BER", "FCO", "BCN", "MAD", "DUB", "BVA", "ATH", "LIS", "SZG", "GRZ", "INN", "LNZ", "KLU"],
    "SZG": ["STN", "AMS", "CRL", "PRG", "BER", "FCO", "BCN", "DUB", "VIE"],
    "GRZ": ["AMS", "CRL", "PRG", "BER", "VIE"],
    "INN": ["AMS", "CRL", "PRG", "BER", "VIE"],
    "LNZ": ["AMS", "CRL", "PRG", "BER", "VIE"],
    "KLU": ["AMS", "CRL", "PRG", "BER", "VIE"],
    
    // Hungarian hubs
    "DEB": ["AMS", "CRL", "PRG", "BER", "BUD", "ATH"],
    
    // Polish hubs (additional)
    "WMI": ["STN", "AMS", "CRL", "PRG", "BER", "FCO", "BCN", "DUB", "BVA", "ATH", "LIS", "POZ", "KTW", "LCJ", "LUZ", "RZE"],
    "POZ": ["STN", "AMS", "CRL", "PRG", "BER", "FCO", "BCN", "DUB", "BVA", "WMI", "KRK"],
    "KTW": ["STN", "AMS", "CRL", "PRG", "BER", "FCO", "BCN", "DUB", "BVA", "WMI", "KRK"],
    "LCJ": ["AMS", "CRL", "PRG", "BER", "WMI", "KRK"],
    "LUZ": ["AMS", "CRL", "PRG", "BER", "WMI"],
    "RZE": ["AMS", "CRL", "PRG", "BER", "WMI", "KRK"],
    
    // Czech hubs (additional)
    "BRQ": ["AMS", "CRL", "PRG", "BER", "FCO", "BCN", "DUB"],
    
    // Croatian hubs
    "ZAG": ["STN", "AMS", "CRL", "PRG", "ATH", "BER", "FCO", "BCN", "DUB", "BVA", "SPU", "DBV", "PUY", "RJK", "ZAD"],
    "SPU": ["STN", "AMS", "CRL", "PRG", "ATH", "BER", "FCO", "BCN", "DUB", "BVA", "ZAG", "DBV"],
    "DBV": ["STN", "AMS", "CRL", "PRG", "ATH", "BER", "FCO", "BCN", "DUB", "BVA", "ZAG", "SPU"],
    "PUY": ["AMS", "CRL", "PRG", "BER", "ZAG", "FCO"],
    "RJK": ["AMS", "CRL", "PRG", "BER", "ZAG"],
    "ZAD": ["AMS", "CRL", "PRG", "BER", "ZAG", "FCO"],
    
    // Serbian hubs
    "BEG": ["STN", "AMS", "CRL", "PRG", "BER", "FCO", "BCN", "DUB", "BVA", "ATH", "INI"],
    "INI": ["AMS", "CRL", "PRG", "BER", "BEG", "ATH"],
    
    // Bosnia and Herzegovina hubs
    "SJJ": ["AMS", "CRL", "PRG", "BER", "FCO", "BCN", "DUB", "BVA", "BNX", "TZL"],
    "BNX": ["AMS", "CRL", "PRG", "BER", "SJJ"],
    "TZL": ["AMS", "CRL", "PRG", "BER", "SJJ", "FCO"],
    
    // Montenegro hubs
    "TGD": ["AMS", "CRL", "PRG", "BER", "FCO", "BCN", "DUB", "BVA", "TIV"],
    "TIV": ["AMS", "CRL", "PRG", "BER", "FCO", "BCN", "DUB", "BVA", "TGD"],
    
    // North Macedonia hubs
    "SKP": ["AMS", "CRL", "PRG", "BER", "FCO", "BCN", "DUB", "BVA", "ATH", "OHD"],
    "OHD": ["AMS", "CRL", "PRG", "BER", "SKP", "ATH"],
    
    // Albanian hub
    "TIA": ["STN", "AMS", "CRL", "PRG", "BER", "FCO", "BCN", "DUB", "BVA", "ATH"],
    
    // Moldovan hub
    "KIV": ["AMS", "CRL", "PRG", "BER", "FCO", "BCN", "DUB", "BVA", "ATH"],
    
    // Ukrainian hubs
    "KBP": ["AMS", "CRL", "PRG", "BER", "FCO", "BCN", "DUB", "BVA", "LWO", "ODS", "HRK"],
    "LWO": ["AMS", "CRL", "PRG", "BER", "FCO", "BCN", "DUB", "BVA", "KBP"],
    "ODS": ["AMS", "CRL", "PRG", "BER", "FCO", "BCN", "DUB", "BVA", "KBP"],
    "HRK": ["AMS", "CRL", "PRG", "BER", "KBP"],
    
    // Cyprus hubs
    "PFO": ["STN", "AMS", "CRL", "PRG", "BER", "FCO", "BCN", "DUB", "BVA", "ATH", "LCA"],
    "LCA": ["STN", "AMS", "CRL", "PRG", "BER", "FCO", "BCN", "DUB", "BVA", "ATH", "PFO"],
    
    // Malta hub
    "MLA": ["STN", "AMS", "CRL", "PRG", "BER", "FCO", "BCN", "DUB", "BVA", "ATH", "LIS"],
    
    // Luxembourg hub
    "LUX": ["STN", "AMS", "CRL", "PRG", "BER", "FCO", "BCN", "DUB", "BVA"],
    
    // Iceland hub
    "KEF": ["STN", "AMS", "CRL", "PRG", "BER", "FCO", "BCN", "DUB", "BVA", "CPH", "ARN"],
    
    // Additional German hubs
    "HHN": ["STN", "AMS", "CRL", "PRG", "BER", "FCO", "BCN", "DUB", "BVA", "CGN", "NRN", "BRE", "HAM", "NUE", "FMM", "FKB", "DTM", "LEJ"],
    "NRN": ["STN", "AMS", "CRL", "PRG", "BER", "HHN"],
    "BRE": ["STN", "AMS", "CRL", "PRG", "BER", "HHN"],
    "HAM": ["STN", "AMS", "CRL", "PRG", "BER", "HHN", "CPH", "ARN"],
    "NUE": ["STN", "AMS", "CRL", "PRG", "BER", "HHN"],
    "FMM": ["STN", "AMS", "CRL", "PRG", "BER", "HHN"],
    "FKB": ["STN", "AMS", "CRL", "PRG", "BER", "HHN"],
    "DTM": ["STN", "AMS", "CRL", "PRG", "BER", "HHN"],
    "LEJ": ["STN", "AMS", "CRL", "PRG", "BER", "HHN"],
    
    // Additional French hubs
    "NTE": ["STN", "AMS", "CRL", "PRG", "BER", "FCO", "BCN", "DUB", "BVA", "LYS", "MPL", "SXB", "LIL", "LRH", "BES", "TUF", "PGF", "LIG", "PIS", "CCF", "RDZ"],
    "LYS": ["STN", "AMS", "CRL", "PRG", "BER", "FCO", "BCN", "DUB", "BVA", "NTE"],
    "MPL": ["STN", "AMS", "CRL", "PRG", "BER", "FCO", "BCN", "DUB", "BVA", "NTE"],
    "SXB": ["STN", "AMS", "CRL", "PRG", "BER", "NTE"],
    "LIL": ["STN", "AMS", "CRL", "PRG", "BER", "NTE"],
    "LRH": ["STN", "AMS", "CRL", "PRG", "BER", "NTE"],
    "BES": ["STN", "AMS", "CRL", "PRG", "BER", "NTE"],
    "TUF": ["AMS", "CRL", "PRG", "BER", "NTE"],
    "PGF": ["AMS", "CRL", "PRG", "BER", "NTE"],
    "LIG": ["AMS", "CRL", "PRG", "BER", "NTE"],
    "PIS": ["AMS", "CRL", "PRG", "BER", "NTE"],
    "CCF": ["AMS", "CRL", "PRG", "BER", "NTE"],
    "RDZ": ["AMS", "CRL", "PRG", "BER", "NTE"],
    
    // Additional Dutch hubs
    "MST": ["AMS", "CRL", "PRG", "BER", "EIN"],
    "GRQ": ["AMS", "CRL", "PRG", "BER", "EIN"],
    
    // Additional Belgian hubs
    "ANR": ["AMS", "CRL", "PRG", "BER", "BRU", "OST"],
    "OST": ["AMS", "CRL", "PRG", "BER", "ANR"],
    
    // Additional Spanish hubs
    "SVQ": ["STN", "AMS", "CRL", "PRG", "BER", "FCO", "BCN", "MAD", "DUB", "BVA", "BIO", "SCQ", "LPA", "TFS", "MAH", "XRY", "GRO", "REU", "SDR", "VGO", "LEI"],
    "BIO": ["STN", "AMS", "CRL", "PRG", "BER", "FCO", "BCN", "MAD", "DUB", "BVA", "SVQ"],
    "SCQ": ["STN", "AMS", "CRL", "PRG", "BER", "FCO", "BCN", "MAD", "DUB", "BVA", "SVQ"],
    "LPA": ["STN", "AMS", "CRL", "PRG", "BER", "FCO", "BCN", "MAD", "DUB", "BVA", "TFS"],
    "TFS": ["STN", "AMS", "CRL", "PRG", "BER", "FCO", "BCN", "MAD", "DUB", "BVA", "LPA"],
    "MAH": ["STN", "AMS", "CRL", "PRG", "BER", "FCO", "BCN", "MAD", "DUB", "BVA"],
    "XRY": ["AMS", "CRL", "PRG", "BER", "SVQ"],
    "GRO": ["AMS", "CRL", "PRG", "BER", "BCN"],
    "REU": ["AMS", "CRL", "PRG", "BER", "BCN"],
    "SDR": ["AMS", "CRL", "PRG", "BER", "SVQ"],
    "VGO": ["AMS", "CRL", "PRG", "BER", "SVQ"],
    "LEI": ["AMS", "CRL", "PRG", "BER", "SVQ"],
    
    // Additional Italian hubs
    "TRN": ["STN", "AMS", "CRL", "PRG", "BER", "FCO", "BCN", "DUB", "BVA", "FLR", "PSA", "BRI", "CTA", "PMO", "CAG", "BDS", "PSR", "AOI", "RMI", "VRN", "TRS"],
    "FLR": ["STN", "AMS", "CRL", "PRG", "BER", "FCO", "BCN", "DUB", "BVA", "TRN"],
    "PSA": ["STN", "AMS", "CRL", "PRG", "BER", "FCO", "BCN", "DUB", "BVA", "TRN"],
    "BRI": ["STN", "AMS", "CRL", "PRG", "BER", "FCO", "BCN", "DUB", "BVA", "TRN"],
    "CTA": ["STN", "AMS", "CRL", "PRG", "BER", "FCO", "BCN", "DUB", "BVA", "TRN"],
    "PMO": ["STN", "AMS", "CRL", "PRG", "BER", "FCO", "BCN", "DUB", "BVA", "TRN"],
    "CAG": ["STN", "AMS", "CRL", "PRG", "BER", "FCO", "BCN", "DUB", "BVA", "TRN"],
    "BDS": ["AMS", "CRL", "PRG", "BER", "TRN"],
    "PSR": ["AMS", "CRL", "PRG", "BER", "TRN"],
    "AOI": ["AMS", "CRL", "PRG", "BER", "TRN"],
    "RMI": ["AMS", "CRL", "PRG", "BER", "TRN"],
    "VRN": ["AMS", "CRL", "PRG", "BER", "TRN"],
    "TRS": ["AMS", "CRL", "PRG", "BER", "TRN"],
    
    // Additional Greek hubs
    "CHQ": ["STN", "AMS", "CRL", "PRG", "BER", "ATH", "HER", "JTR", "JMK", "KGS", "ZTH", "EFL", "KVA", "VOL"],
    "HER": ["STN", "AMS", "CRL", "PRG", "BER", "ATH", "CHQ"],
    "JTR": ["STN", "AMS", "CRL", "PRG", "BER", "ATH", "CHQ"],
    "JMK": ["STN", "AMS", "CRL", "PRG", "BER", "ATH", "CHQ"],
    "KGS": ["STN", "AMS", "CRL", "PRG", "BER", "ATH", "CHQ"],
    "ZTH": ["STN", "AMS", "CRL", "PRG", "BER", "ATH", "CHQ"],
    "EFL": ["STN", "AMS", "CRL", "PRG", "BER", "ATH", "CHQ"],
    "KVA": ["AMS", "CRL", "PRG", "BER", "ATH", "CHQ"],
    "VOL": ["AMS", "CRL", "PRG", "BER", "ATH", "CHQ"],
    
    // Additional Portuguese hubs
    "FNC": ["STN", "AMS", "CRL", "PRG", "BER", "LIS", "OPO", "PDL"],
    "PDL": ["STN", "AMS", "CRL", "PRG", "BER", "LIS", "FNC"],
    
    // Additional Scandinavian hubs
    "MMX": ["STN", "AMS", "CRL", "PRG", "BER", "ARN", "GOT", "VST"],
    "VST": ["AMS", "CRL", "PRG", "BER", "ARN", "MMX"],
    "SVG": ["STN", "AMS", "CRL", "PRG", "BER", "OSL", "BGO", "TRD"],
    "TRD": ["AMS", "CRL", "PRG", "BER", "OSL", "SVG"],
    "AAR": ["AMS", "CRL", "PRG", "BER", "CPH", "BLL"],
    
    // Additional UK hubs
    "LBA": ["STN", "DUB", "AMS", "CRL", "PRG", "BER", "FCO", "BCN", "BVA", "NCL", "BFS"],
    "NCL": ["STN", "DUB", "AMS", "CRL", "PRG", "BER", "LBA"],
    "BFS": ["STN", "DUB", "AMS", "CRL", "PRG", "BER", "LBA"],
    
    // Additional Irish hubs
    "KIR": ["STN", "AMS", "CRL", "PRG", "BER", "DUB", "ORK", "SNN"]
};