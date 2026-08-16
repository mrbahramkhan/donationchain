class DonationCase {
  final int id;
  final String title;
  final String category;
  final String city;
  final int amount;
  final int raised;
  final String urgency;
  final bool verified;
  final String vendor;

  DonationCase({
    required this.id,
    required this.title,
    required this.category,
    required this.city,
    required this.amount,
    required this.raised,
    required this.urgency,
    required this.verified,
    required this.vendor,
  });

  double get progress => (raised / amount).clamp(0.0, 1.0);
  int get remaining => (amount - raised).clamp(0, amount);
}

class DonationRecord {
  final int id;
  final int amount;
  final String method;
  final String caseTitle;
  final bool anonymous;
  final DateTime date;
  final String status;
  final String proof;

  DonationRecord({
    required this.id,
    required this.amount,
    required this.method,
    required this.caseTitle,
    required this.anonymous,
    required this.date,
    required this.status,
    required this.proof,
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'amount': amount,
        'method': method,
        'caseTitle': caseTitle,
        'anonymous': anonymous,
        'date': date.toIso8601String(),
        'status': status,
        'proof': proof,
      };

  factory DonationRecord.fromJson(Map<String, dynamic> j) => DonationRecord(
        id: j['id'],
        amount: j['amount'],
        method: j['method'],
        caseTitle: j['caseTitle'],
        anonymous: j['anonymous'] ?? false,
        date: DateTime.parse(j['date']),
        status: j['status'],
        proof: j['proof'] ?? '',
      );
}
