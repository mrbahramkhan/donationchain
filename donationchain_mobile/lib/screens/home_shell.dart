import 'package:flutter/material.dart';
import '../services/data_service.dart';
import 'apply_screen.dart';
import 'cases_screen.dart';
import 'dashboard_screen.dart';
import 'login_screen.dart';
import 'zakat_screen.dart';
import 'admin_screen.dart';

class HomeShell extends StatefulWidget {
  const HomeShell({super.key});

  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  int index = 0;
  String role = 'donor';

  @override
  void initState() {
    super.initState();
    DataService.getUser().then((u) {
      if (mounted) setState(() => role = u['role'] ?? 'donor');
    });
  }

  @override
  Widget build(BuildContext context) {
    final isSeeker = role == 'seeker';
    final pages = isSeeker
        ? const [
            ApplyScreen(),
            CasesScreen(),
          ]
        : const [
            CasesScreen(),
            DashboardScreen(),
            ZakatScreen(),
            AdminScreen(),
          ];

    final destinations = isSeeker
        ? const [
            NavigationDestination(
              icon: Icon(Icons.edit_note_outlined),
              selectedIcon: Icon(Icons.edit_note),
              label: 'Apply',
            ),
            NavigationDestination(
              icon: Icon(Icons.favorite_outline),
              selectedIcon: Icon(Icons.favorite),
              label: 'Cases',
            ),
          ]
        : const [
            NavigationDestination(
              icon: Icon(Icons.favorite_outline),
              selectedIcon: Icon(Icons.favorite),
              label: 'Cases',
            ),
            NavigationDestination(
              icon: Icon(Icons.dashboard_outlined),
              selectedIcon: Icon(Icons.dashboard),
              label: 'Impact',
            ),
            NavigationDestination(
              icon: Icon(Icons.calculate_outlined),
              selectedIcon: Icon(Icons.calculate),
              label: 'Zakat',
            ),
            NavigationDestination(
              icon: Icon(Icons.admin_panel_settings_outlined),
              selectedIcon: Icon(Icons.admin_panel_settings),
              label: 'Admin',
            ),
          ];

    if (index >= pages.length) index = 0;

    return Scaffold(
      appBar: AppBar(
        title: Text(isSeeker ? 'DonationChain · Seeker' : 'DonationChain'),
        actions: [
          if (!isSeeker)
            IconButton(
              tooltip: 'Need help? Open apply form',
              icon: const Icon(Icons.handshake_outlined),
              onPressed: () {
                Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const ApplyScreen()),
                );
              },
            ),
          IconButton(
            tooltip: 'Switch role / logout',
            icon: const Icon(Icons.logout),
            onPressed: () async {
              await DataService.logout();
              if (!context.mounted) return;
              Navigator.of(context).pushReplacement(
                MaterialPageRoute(builder: (_) => const LoginScreen()),
              );
            },
          ),
        ],
      ),
      body: pages[index],
      bottomNavigationBar: NavigationBar(
        selectedIndex: index,
        onDestinationSelected: (i) => setState(() => index = i),
        destinations: destinations,
      ),
    );
  }
}
