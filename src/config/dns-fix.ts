import dns from 'dns';

// Override DNS resolution to prefer IPv4
dns.setDefaultResultOrder('ipv4first');

// Or try this alternative:
// dns.setServers(['8.8.8.8', '1.1.1.1']);