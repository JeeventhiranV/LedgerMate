/* ============================================================================
 * dsa-systemdesign-content.js
 * Data + content for DSA_SystemDesign.html — Java Backend, LLD & System Design
 * Interview Handbook.
 * ----------------------------------------------------------------------------
 * window.SD_TOPICS  : ordered category/topic registry (drives the sidebar).
 * window.SD_CONTENT : map of topicId -> full HTML module (authored per category).
 *
 * Content authoring conventions (the page wires interactivity around these):
 *   <section class="sd-block" data-sec="overview"> … </section>   collapsible block
 *   <h2 class="sd-h2">1. Overview</h2>                            section heading
 *   <pre><code class="language-java"> … </code></pre>            Prism-highlighted + copy/download
 *   <pre class="mermaid"> … </pre>                                Mermaid diagram
 *   <div class="sd-callout tip|warn|trap|info"> … </div>          callout box
 *   <details class="sd-faq"><summary>Q</summary> … </details>     FAQ accordion
 *   <table> … </table>                                            comparison tables
 *
 * Priorities: must-know | important | advanced | specialized | optional
 * ==========================================================================*/
window.SD_TOPICS = [
  {
    id: 'lld', icon: '🏢', title: 'LLD Interview Prep',
    topics: [
      { id: 'atm-machine',      icon: '🏧', title: 'ATM Machine',        priority: 'must-know' },
      { id: 'bookmyshow',       icon: '🎬', title: 'BookMyShow',         priority: 'must-know' },
      { id: 'elevator',         icon: '🛗', title: 'Elevator',           priority: 'must-know' },
      { id: 'food-delivery',    icon: '🍔', title: 'Food Delivery',      priority: 'must-know' },
      { id: 'lru-cache',        icon: '🗄️', title: 'LRU Cache',          priority: 'must-know' },
      { id: 'parking-lot',      icon: '🅿️', title: 'Parking Lot',        priority: 'must-know' },
      { id: 'rate-limiter-lld', icon: '🚦', title: 'Rate Limiter',       priority: 'must-know' },
      { id: 'splitwise',        icon: '💸', title: 'Splitwise',          priority: 'must-know' },
      { id: 'logger',           icon: '📝', title: 'Design a Logger',    priority: 'important' },
      { id: 'meeting-scheduler',icon: '📅', title: 'Meeting Scheduler',  priority: 'important' },
      { id: 'snake-ladder',     icon: '🎲', title: 'Snake & Ladder',     priority: 'important' }
    ]
  },
  {
    id: 'concurrency', icon: '⚡', title: 'Concurrency & Threading',
    topics: [
      { id: 'completablefuture',           icon: '🔗', title: 'CompletableFuture & Async Composition', priority: 'must-know' },
      { id: 'concurrency-basics',          icon: '🧠', title: 'Concurrency Basics',                    priority: 'must-know' },
      { id: 'concurrenthashmap',           icon: '🗺️', title: 'ConcurrentHashMap & Concurrent Collections', priority: 'must-know' },
      { id: 'synchronization-types',       icon: '🧰', title: 'Synchronization (Types & Use Cases)',   priority: 'must-know' },
      { id: 'synchronized-vs-reentrantlock',icon: '🔐', title: 'synchronized vs ReentrantLock',        priority: 'must-know' },
      { id: 'thread-pools',                icon: '🧵', title: 'Thread Pools & ExecutorService',        priority: 'must-know' },
      { id: 'volatile-atomic-transient',   icon: '🧪', title: 'volatile / atomic / transient',         priority: 'must-know' },
      { id: 'volatile-keyword',            icon: '📡', title: 'volatile Keyword',                      priority: 'must-know' },
      { id: 'blockingqueue',               icon: '📦', title: 'BlockingQueue',                         priority: 'important' },
      { id: 'deadlock-livelock-starvation',icon: '🧯', title: 'Deadlock / Livelock / Starvation',      priority: 'important' },
      { id: 'hashmap-vs-chm-internal',     icon: '⚙️', title: 'Internal Working: HashMap vs ConcurrentHashMap', priority: 'advanced' },
      { id: 'jvm-gc-overview',             icon: '♻️', title: 'JVM / GC Overview',                     priority: 'advanced' },
      { id: 'virtual-threads',             icon: '🪶', title: 'Virtual Threads (Java 21)',             priority: 'advanced' },
      { id: 'weakhashmap',                 icon: '🫧', title: 'WeakHashMap',                           priority: 'specialized' },
      { id: 'reference-types',             icon: '🧷', title: 'Weak / Soft / Phantom Reference',       priority: 'specialized' }
    ]
  },
  {
    id: 'networking', icon: '🌐', title: 'Networking & Realtime',
    topics: [
      { id: 'api-gateway',          icon: '🛂', title: 'API Gateway',                priority: 'must-know' },
      { id: 'authn-authz',          icon: '🔐', title: 'Authentication & Authorization', priority: 'must-know' },
      { id: 'jwt-vs-session-oauth', icon: '🔑', title: 'JWT vs Session / OAuth',     priority: 'must-know' },
      { id: 'rest-vs-grpc',         icon: '⚖️', title: 'REST vs gRPC',               priority: 'must-know' },
      { id: 'grpc',                 icon: '🚀', title: 'gRPC',                       priority: 'important' },
      { id: 'webhook',              icon: '🪝', title: 'Webhook',                    priority: 'important' },
      { id: 'websocket',            icon: '🌐', title: 'WebSocket',                  priority: 'important' }
    ]
  },
  {
    id: 'databases', icon: '💾', title: 'Databases & API Data Access',
    topics: [
      { id: 'database-indexing',     icon: '🗂️', title: 'Database Indexing',           priority: 'must-know' },
      { id: 'n-plus-1',              icon: '➕', title: 'N+1 Queries & Batching',      priority: 'must-know' },
      { id: 'pagination',           icon: '📄', title: 'Pagination Strategies',       priority: 'must-know' },
      { id: 'transactions-isolation',icon: '🧾', title: 'Transactions & Isolation',    priority: 'must-know' },
      { id: 'connection-pooling',   icon: '🏊', title: 'Connection Pooling (HikariCP)', priority: 'important' },
      { id: 'sharding-partitioning',icon: '🧩', title: 'Database Sharding & Partitioning', priority: 'advanced' }
    ]
  },
  {
    id: 'reliability', icon: '🛡', title: 'Reliability & Scalability',
    topics: [
      { id: 'caching-patterns',     icon: '🗄', title: 'Caching Patterns',           priority: 'must-know' },
      { id: 'fault-tolerance',      icon: '🧯', title: 'Fault Tolerance',            priority: 'must-know' },
      { id: 'idempotency',          icon: '♻️', title: 'Idempotency',                priority: 'must-know' },
      { id: 'rate-limiting',        icon: '🚦', title: 'Rate Limiting',              priority: 'must-know' },
      { id: 'circuit-breaker',      icon: '🛡️', title: 'Circuit Breaker / Retry / Bulkhead', priority: 'important' },
      { id: 'resilience4j',         icon: '🧩', title: 'Circuit Breakers & Retries (Resilience4j)', priority: 'important' },
      { id: 'distributed-locks',    icon: '🔒', title: 'Distributed Locks',          priority: 'advanced' }
    ]
  },
  {
    id: 'solid', icon: '🧱', title: 'SOLID Principles',
    topics: [
      { id: 'class-relationships',   icon: '🔗', title: 'Class Relationships',        priority: 'must-know' },
      { id: 'dependency-inversion',  icon: '⬇️', title: 'Dependency Inversion (D)',   priority: 'must-know' },
      { id: 'single-responsibility', icon: '🎯', title: 'Single Responsibility (S)',  priority: 'must-know' },
      { id: 'interface-segregation', icon: '🔌', title: 'Interface Segregation (I)',  priority: 'important' },
      { id: 'liskov-substitution',   icon: '🔁', title: 'Liskov Substitution (L)',    priority: 'important' },
      { id: 'open-closed',           icon: '🔓', title: 'Open / Closed (O)',          priority: 'important' }
    ]
  },
  {
    id: 'creational', icon: '🏗', title: 'Creational Patterns',
    topics: [
      { id: 'builder',          icon: '🧱', title: 'Builder',          priority: 'must-know' },
      { id: 'factory-method',   icon: '🏭', title: 'Factory Method',   priority: 'must-know' },
      { id: 'singleton',        icon: '🔒', title: 'Singleton',        priority: 'must-know' },
      { id: 'abstract-factory', icon: '🎭', title: 'Abstract Factory', priority: 'important' },
      { id: 'prototype',        icon: '🧬', title: 'Prototype',        priority: 'optional' }
    ]
  },
  {
    id: 'architecture', icon: '🏛', title: 'Architecture Styles',
    topics: [
      { id: 'sd-framework',          icon: '🎯', title: 'Framework For System Design Interviews', priority: 'must-know' },
      { id: 'scale-to-millions',     icon: '📈', title: 'Scale From Zero To Millions Of Users',   priority: 'must-know' },
      { id: 'tradeoffs',             icon: '⚖️', title: 'Trade-offs in System Design',            priority: 'must-know' },
      { id: 'docker-fundamentals',   icon: '🐳', title: 'Docker Fundamentals',                    priority: 'important' },
      { id: 'junit-spring-boot',     icon: '🧪', title: 'JUnit Testing in Spring Boot',           priority: 'important' },
      { id: 'redis-fundamentals',    icon: '🟥', title: 'Redis Fundamentals',                     priority: 'important' },
      { id: 'cqrs-pattern',          icon: '🧩', title: 'CQRS Pattern',                           priority: 'advanced' },
      { id: 'saga-pattern',          icon: '🧾', title: 'SAGA Pattern',                           priority: 'advanced' },
      { id: 'zero-downtime-deploy',  icon: '🟢', title: 'Zero Downtime Deployment Strategies',    priority: 'advanced' },
      { id: 'cqrs-event-sourcing',   icon: '🧠', title: 'CQRS / Event Sourcing (Overview)',       priority: 'specialized' }
    ]
  },
  {
    id: 'behavioral', icon: '🎭', title: 'Behavioral Patterns',
    topics: [
      { id: 'observer',            icon: '👀', title: 'Observer',                priority: 'must-know' },
      { id: 'strategy',            icon: '🎯', title: 'Strategy',                priority: 'must-know' },
      { id: 'chain-of-responsibility', icon: '⛓', title: 'Chain of Responsibility', priority: 'important' },
      { id: 'command',             icon: '📦', title: 'Command',                 priority: 'important' },
      { id: 'state',               icon: '🎬', title: 'State',                   priority: 'important' },
      { id: 'mediator',            icon: '🤝', title: 'Mediator',                priority: 'optional' },
      { id: 'memento',             icon: '🧠', title: 'Memento',                 priority: 'optional' },
      { id: 'template-method',     icon: '🏛', title: 'Template Method',         priority: 'optional' },
      { id: 'visitor',             icon: '👤', title: 'Visitor',                 priority: 'optional' }
    ]
  },
  {
    id: 'structural', icon: '🧩', title: 'Structural Patterns',
    topics: [
      { id: 'decorator', icon: '🎁', title: 'Decorator', priority: 'must-know' },
      { id: 'adapter',   icon: '🔌', title: 'Adapter',   priority: 'important' },
      { id: 'facade',    icon: '🪞', title: 'Facade',    priority: 'important' },
      { id: 'proxy',     icon: '🛡', title: 'Proxy',     priority: 'important' },
      { id: 'composite', icon: '🌳', title: 'Composite', priority: 'optional' }
    ]
  },
  {
    id: 'messaging', icon: '📨', title: 'Messaging & Streaming',
    topics: [
      { id: 'kafka-basics',        icon: '🧵', title: 'Kafka Basics',                      priority: 'important' },
      { id: 'queue-rabbit-vs-kafka', icon: '📨', title: 'Queue-Based Systems (RabbitMQ vs Kafka)', priority: 'important' },
      { id: 'sqs-basics',          icon: '📬', title: 'SQS Basics',                        priority: 'important' },
      { id: 'sqs-vs-rabbitmq',     icon: '⚖️', title: 'SQS vs RabbitMQ',                   priority: 'important' }
    ]
  }
];

window.SD_CONTENT = window.SD_CONTENT || {};

/* ════════════════════════════ LLD INTERVIEW PREP ════════════════════════════ */
Object.assign(window.SD_CONTENT, {

  "parking-lot": `
    <section class="sd-block" data-sec="overview"><h2 class="sd-h2">1. Overview</h2><div class="sd-block-body">
      <p>The <strong>Parking Lot</strong> is the canonical low-level design interview question. You model a multi-floor parking facility that admits vehicles of different sizes, allocates the nearest suitable spot, issues a ticket on entry, and computes a fee on exit. It tests <em>object modelling</em>, <em>enum/strategy usage</em>, <em>extensibility</em> and <em>thread-safety</em> — not algorithms.</p>
      <p><strong>Why it exists:</strong> it forces you to translate fuzzy real-world rules ("bikes fit in car spots but not vice-versa", "pricing differs by vehicle and duration") into clean, open-for-extension classes. Companies (Amazon, Google, Uber) use it to gauge whether you can apply SOLID and design patterns under ambiguity.</p>
      <div class="sd-callout info"><span class="sd-callout-l">Interview tip</span>Spend the first 3–4 minutes clarifying requirements out loud. The grader scores you on <em>how you scope</em> as much as the code.</div>
    </div></section>

    <section class="sd-block" data-sec="requirements"><h2 class="sd-h2">2. Requirements</h2><div class="sd-block-body">
      <h4>Functional</h4>
      <ul>
        <li>Multiple floors, each with many spots of types: <code>MOTORCYCLE</code>, <code>COMPACT</code>, <code>LARGE</code>, <code>EV</code> (with charger), <code>HANDICAPPED</code>.</li>
        <li>Park a vehicle → allocate the nearest free, compatible spot, issue a <code>Ticket</code>.</li>
        <li>Unpark → free the spot, compute fee from duration + vehicle type.</li>
        <li>Display real-time availability per floor/type; support entry/exit gates and multiple payment methods.</li>
      </ul>
      <h4>Non-functional</h4>
      <ul>
        <li><strong>Concurrency:</strong> many gates park simultaneously — no double-allocation of a spot.</li>
        <li><strong>Extensible:</strong> new vehicle types, new pricing, new allocation strategy without touching existing code (OCP).</li>
        <li>Low latency O(1) allocation; durable tickets.</li>
      </ul>
    </div></section>

    <section class="sd-block" data-sec="class-diagram"><h2 class="sd-h2">3. Class Diagram</h2><div class="sd-block-body">
      <pre class="mermaid">classDiagram
  class ParkingLot { -List~ParkingFloor~ floors; +park(Vehicle) Ticket; +unpark(Ticket) double }
  class ParkingFloor { -List~ParkingSpot~ spots; +findSpot(VehicleType) ParkingSpot }
  class ParkingSpot { #String id; #boolean free; #SpotType type; +canFit(VehicleType) boolean }
  class Vehicle { #String plate; #VehicleType type }
  class Ticket { +String id; +Vehicle vehicle; +ParkingSpot spot; +Instant entryTime }
  class FeeStrategy { <<interface>> +calculate(Ticket, Instant) double }
  class SpotAllocationStrategy { <<interface>> +allocate(List~ParkingFloor~, Vehicle) ParkingSpot }
  ParkingLot --> ParkingFloor
  ParkingFloor --> ParkingSpot
  ParkingLot --> FeeStrategy
  ParkingLot --> SpotAllocationStrategy
  Ticket --> Vehicle
  Ticket --> ParkingSpot</pre>
    </div></section>

    <section class="sd-block" data-sec="design"><h2 class="sd-h2">4. Core Design — Patterns & SOLID</h2><div class="sd-block-body">
      <table>
        <thead><tr><th>Concern</th><th>Pattern</th><th>Why</th></tr></thead>
        <tbody>
          <tr><td>Spot selection</td><td><strong>Strategy</strong></td><td>Swap nearest-first / floor-by-floor / EV-priority without editing the lot.</td></tr>
          <tr><td>Pricing</td><td><strong>Strategy</strong></td><td>Flat, hourly-tiered, weekend pricing are interchangeable.</td></tr>
          <tr><td>Vehicle/Spot creation</td><td><strong>Factory</strong></td><td>Centralize construction by type.</td></tr>
          <tr><td>Single lot instance</td><td><strong>Singleton</strong> (or Spring bean)</td><td>One source of truth for availability.</td></tr>
          <tr><td>Availability boards</td><td><strong>Observer</strong></td><td>Displays update when a spot frees/occupies.</td></tr>
        </tbody>
      </table>
      <p><strong>SOLID:</strong> SRP (each class one job) · OCP (new strategies/types added, not modified) · LSP (<code>Bike</code>/<code>Car</code> substitute <code>Vehicle</code>) · DIP (lot depends on <code>FeeStrategy</code>/<code>SpotAllocationStrategy</code> interfaces).</p>
    </div></section>

    <section class="sd-block" data-sec="java"><h2 class="sd-h2">5. Complete Java Implementation</h2><div class="sd-block-body">
      <h4>Enums & domain</h4>
      <pre><code class="language-java">public enum VehicleType { MOTORCYCLE, COMPACT, LARGE, EV }
public enum SpotType {
    MOTORCYCLE, COMPACT, LARGE, EV;
    // a spot fits a vehicle if its type is "big enough"
    public boolean fits(VehicleType v) {
        return switch (this) {
            case MOTORCYCLE -> v == VehicleType.MOTORCYCLE;
            case COMPACT    -> v == VehicleType.MOTORCYCLE || v == VehicleType.COMPACT;
            case LARGE      -> true;
            case EV         -> v == VehicleType.EV;
        };
    }
}

public abstract class Vehicle {
    private final String plate;
    private final VehicleType type;
    protected Vehicle(String plate, VehicleType type) { this.plate = plate; this.type = type; }
    public String getPlate() { return plate; }
    public VehicleType getType() { return type; }
}
public class Car extends Vehicle { public Car(String p){ super(p, VehicleType.COMPACT);} }
public class Bike extends Vehicle { public Bike(String p){ super(p, VehicleType.MOTORCYCLE);} }
public class Truck extends Vehicle{ public Truck(String p){ super(p, VehicleType.LARGE);} }</code></pre>

      <h4>Spot (thread-safe occupancy)</h4>
      <pre><code class="language-java">public class ParkingSpot {
    private final String id;
    private final SpotType type;
    private final java.util.concurrent.atomic.AtomicReference&lt;Vehicle&gt; vehicle = new java.util.concurrent.atomic.AtomicReference&lt;&gt;();

    public ParkingSpot(String id, SpotType type) { this.id = id; this.type = type; }
    public String getId() { return id; }
    public SpotType getType() { return type; }
    public boolean isFree() { return vehicle.get() == null; }

    /** CAS occupancy — two gates racing for the same spot: exactly one wins. */
    public boolean assign(Vehicle v) {
        if (!type.fits(v.getType())) return false;
        return vehicle.compareAndSet(null, v);
    }
    public void release() { vehicle.set(null); }
}</code></pre>

      <h4>Strategies (allocation & fee)</h4>
      <pre><code class="language-java">public interface SpotAllocationStrategy {
    java.util.Optional&lt;ParkingSpot&gt; allocate(java.util.List&lt;ParkingFloor&gt; floors, Vehicle v);
}
public class NearestFirstStrategy implements SpotAllocationStrategy {
    public java.util.Optional&lt;ParkingSpot&gt; allocate(java.util.List&lt;ParkingFloor&gt; floors, Vehicle v) {
        for (ParkingFloor f : floors) {                 // floors ordered nearest-first
            var spot = f.findAndAssign(v);
            if (spot.isPresent()) return spot;
        }
        return java.util.Optional.empty();
    }
}

public interface FeeStrategy { double calculate(Ticket t, java.time.Instant exit); }
public class HourlyFeeStrategy implements FeeStrategy {
    private static final java.util.Map&lt;VehicleType, Double&gt; RATE = java.util.Map.of(
        VehicleType.MOTORCYCLE, 10.0, VehicleType.COMPACT, 20.0,
        VehicleType.LARGE, 40.0, VehicleType.EV, 25.0);
    public double calculate(Ticket t, java.time.Instant exit) {
        long hours = Math.max(1, java.time.Duration.between(t.getEntryTime(), exit).toHours());
        return hours * RATE.getOrDefault(t.getVehicle().getType(), 20.0);
    }
}</code></pre>

      <h4>Floor, Ticket, and the ParkingLot facade</h4>
      <pre><code class="language-java">public class ParkingFloor {
    private final String id;
    private final java.util.List&lt;ParkingSpot&gt; spots;
    public ParkingFloor(String id, java.util.List&lt;ParkingSpot&gt; spots){ this.id=id; this.spots=spots; }
    public java.util.Optional&lt;ParkingSpot&gt; findAndAssign(Vehicle v) {
        for (ParkingSpot s : spots)
            if (s.isFree() &amp;&amp; s.assign(v)) return java.util.Optional.of(s); // assign() is atomic
        return java.util.Optional.empty();
    }
    public long freeCount(SpotType type){ return spots.stream().filter(s-&gt;s.getType()==type &amp;&amp; s.isFree()).count(); }
}

public class Ticket {
    private final String id; private final Vehicle vehicle;
    private final ParkingSpot spot; private final java.time.Instant entryTime;
    public Ticket(Vehicle v, ParkingSpot s){ this.id=java.util.UUID.randomUUID().toString();
        this.vehicle=v; this.spot=s; this.entryTime=java.time.Instant.now(); }
    public String getId(){return id;} public Vehicle getVehicle(){return vehicle;}
    public ParkingSpot getSpot(){return spot;} public java.time.Instant getEntryTime(){return entryTime;}
}

public class ParkingLot {
    private final java.util.List&lt;ParkingFloor&gt; floors;
    private final SpotAllocationStrategy allocation;
    private final FeeStrategy fee;
    private final java.util.Map&lt;String, Ticket&gt; active = new java.util.concurrent.ConcurrentHashMap&lt;&gt;();

    public ParkingLot(java.util.List&lt;ParkingFloor&gt; floors, SpotAllocationStrategy a, FeeStrategy f){
        this.floors=floors; this.allocation=a; this.fee=f;
    }
    public Ticket park(Vehicle v) {
        ParkingSpot spot = allocation.allocate(floors, v)
            .orElseThrow(() -&gt; new ParkingFullException(v.getType()));
        Ticket t = new Ticket(v, spot);
        active.put(t.getId(), t);
        return t;
    }
    public double unpark(String ticketId) {
        Ticket t = active.remove(ticketId);
        if (t == null) throw new InvalidTicketException(ticketId);
        double amount = fee.calculate(t, java.time.Instant.now());
        t.getSpot().release();
        return amount;
    }
}</code></pre>

      <h4>Exceptions</h4>
      <pre><code class="language-java">public class ParkingFullException extends RuntimeException {
    public ParkingFullException(VehicleType t){ super("No free spot for " + t); }
}
public class InvalidTicketException extends RuntimeException {
    public InvalidTicketException(String id){ super("Unknown ticket: " + id); }
}</code></pre>
    </div></section>

    <section class="sd-block" data-sec="sequence"><h2 class="sd-h2">6. Sequence Diagram (park → unpark)</h2><div class="sd-block-body">
      <pre class="mermaid">sequenceDiagram
  participant G as EntryGate
  participant L as ParkingLot
  participant A as AllocationStrategy
  participant S as ParkingSpot
  G->>L: park(vehicle)
  L->>A: allocate(floors, vehicle)
  A->>S: assign(vehicle) [CAS]
  S-->>A: ok
  A-->>L: spot
  L-->>G: Ticket(id, spot, entryTime)
  Note over G,L: later…
  G->>L: unpark(ticketId)
  L->>S: release()
  L-->>G: fee amount</pre>
    </div></section>

    <section class="sd-block" data-sec="concurrency"><h2 class="sd-h2">7. Concurrency & Edge Cases</h2><div class="sd-block-body">
      <ul>
        <li><strong>Double allocation race:</strong> two gates pick the same free spot. Solved by <code>AtomicReference.compareAndSet</code> in <code>assign()</code> — only one CAS succeeds; the loser continues scanning.</li>
        <li><strong>Lot full:</strong> throw a domain exception rather than returning <code>null</code>.</li>
        <li><strong>Invalid/duplicate ticket on exit:</strong> <code>active.remove</code> returns null → reject.</li>
        <li><strong>EV without charger / oversized vehicle:</strong> <code>SpotType.fits</code> guards compatibility.</li>
        <li><strong>Clock:</strong> inject a <code>Clock</code> for testable fee math instead of <code>Instant.now()</code>.</li>
      </ul>
      <div class="sd-callout warn"><span class="sd-callout-l">Trap</span>Using a single global <code>synchronized</code> lock around <code>park()</code> "works" but serializes the whole lot. Per-spot CAS scales to many gates.</div>
    </div></section>

    <section class="sd-block" data-sec="hld"><h2 class="sd-h2">8. High-Level Design — Scaling Out</h2><div class="sd-block-body">
      <p>A single in-memory lot becomes a distributed system when you run many physical lots / a city-scale operator (think a SpotHero or Uber parking backend):</p>
      <ul>
        <li><strong>Availability store:</strong> Redis hash per floor (<code>HINCRBY</code> free counters) for O(1) reads on display boards; source of truth in PostgreSQL.</li>
        <li><strong>Allocation atomicity across nodes:</strong> a Redis Lua script (or <code>SELECT … FOR UPDATE SKIP LOCKED</code>) to claim a spot without double-booking — see <a href="#distributed-locks">Distributed Locks</a>.</li>
        <li><strong>Events:</strong> publish <code>SpotOccupied/Freed</code> to Kafka; displays and analytics subscribe (Observer at scale).</li>
        <li><strong>Payments:</strong> idempotent exit charge (see <a href="#idempotency">Idempotency</a>) so a retried unpark doesn't double-charge.</li>
      </ul>
      <pre class="mermaid">graph TD
  G[Entry/Exit Gates] --> API[Parking Service - Spring Boot]
  API --> R[(Redis: availability)]
  API --> DB[(PostgreSQL: tickets)]
  API --> K[Kafka: spot events]
  K --> DISP[Display Boards]
  K --> AN[Analytics]</pre>
    </div></section>

    <section class="sd-block" data-sec="pros-cons"><h2 class="sd-h2">9. Advantages, Disadvantages & Trade-offs</h2><div class="sd-block-body">
      <h4>Advantages</h4><ul><li>Strategy-driven → new pricing/allocation with zero edits to the lot.</li><li>CAS occupancy → high concurrency, no global lock.</li><li>Clear domain model maps 1:1 to interview talking points.</li></ul>
      <h4>Disadvantages / Trade-offs</h4><ul><li>Linear scan per floor is O(spots); for huge floors keep a per-type free-list/queue for O(1).</li><li>In-memory state is not durable — needs DB/Redis backing for production.</li></ul>
    </div></section>

    <section class="sd-block" data-sec="best"><h2 class="sd-h2">10. Best Practices & Common Mistakes</h2><div class="sd-block-body">
      <h4>Best practices</h4><ul><li>Program to interfaces (<code>FeeStrategy</code>, <code>SpotAllocationStrategy</code>).</li><li>Throw domain exceptions; never leak <code>null</code>.</li><li>Keep a free-list per spot type for O(1) allocation at scale.</li><li>Inject <code>Clock</code> for deterministic fee tests.</li></ul>
      <h4>Common mistakes</h4><ul><li>God-class <code>ParkingLot</code> doing pricing + allocation + persistence (violates SRP).</li><li>Boolean <code>isFree</code> mutated without atomicity → double-booking.</li><li>Hard-coding vehicle/spot compatibility with <code>if-else</code> chains instead of an enum/strategy.</li></ul>
    </div></section>

    <section class="sd-block" data-sec="interview"><h2 class="sd-h2">11. Interview Q&amp;A</h2><div class="sd-block-body">
      <details class="sd-faq"><summary>How do you prevent two cars from getting the same spot?</summary><div>Make occupancy a CAS operation (<code>AtomicReference.compareAndSet(null, vehicle)</code>) or, in a distributed setup, an atomic Redis Lua claim / <code>FOR UPDATE SKIP LOCKED</code>. Only one writer wins; the other retries.</div></details>
      <details class="sd-faq"><summary>How would you add weekend/holiday pricing?</summary><div>Add a new <code>FeeStrategy</code> implementation and inject it (OCP). No change to <code>ParkingLot</code>. You can also compose strategies (decorator) for surcharges.</div></details>
      <details class="sd-faq"><summary>How to make allocation O(1)?</summary><div>Maintain a <code>Queue&lt;ParkingSpot&gt;</code> (free-list) per <code>SpotType</code>; <code>poll()</code> to allocate, <code>offer()</code> on release. Use a concurrent queue for thread-safety.</div></details>
      <details class="sd-faq"><summary>How do EV charging spots fit in?</summary><div>Model <code>SpotType.EV</code> whose <code>fits</code> only accepts <code>VehicleType.EV</code>; allocation strategy can prefer EV spots for EVs and fall back. Charger state is an extra attribute on the spot.</div></details>
      <details class="sd-faq"><summary>Where would you persist tickets?</summary><div>PostgreSQL for durability/audit, Redis for hot availability counters, Kafka for spot events feeding boards/analytics.</div></details>
    </div></section>

    <section class="sd-block" data-sec="followups"><h2 class="sd-h2">12. Follow-ups & Testing</h2><div class="sd-block-body">
      <ul>
        <li><strong>Follow-up:</strong> multi-lot reservation with a hold/expiry → introduce a <code>Reservation</code> with TTL (Redis key with expiry) before converting to a ticket.</li>
        <li><strong>Follow-up:</strong> lost ticket → flat penalty fee strategy keyed by entry scan.</li>
        <li><strong>Testing:</strong> concurrency test spawning N threads calling <code>park()</code> on a 1-spot lot — assert exactly one ticket and one <code>ParkingFullException</code>×(N−1). Fee tests with an injected fixed <code>Clock</code>.</li>
      </ul>
      <div class="sd-callout tip"><span class="sd-callout-l">Key takeaway</span>The Parking Lot is graded on extensibility (Strategy/Factory + SOLID) and safe concurrent occupancy (CAS), not on clever data structures.</div>
    </div></section>
  `,

  "lru-cache": `
    <section class="sd-block" data-sec="overview"><h2 class="sd-h2">1. Overview</h2><div class="sd-block-body">
      <p>An <strong>LRU (Least Recently Used) Cache</strong> stores a bounded number of key→value entries and, when full, evicts the entry that was accessed least recently. It must offer <strong>O(1)</strong> <code>get</code> and <code>put</code>. It's both a classic coding question and a foundational systems building block (CPU caches, Redis <code>allkeys-lru</code>, Guava/Caffeine, HTTP caches).</p>
      <p><strong>Why it exists:</strong> memory is finite; LRU is a cheap, effective approximation of "keep the hot set" under temporal locality.</p>
    </div></section>

    <section class="sd-block" data-sec="requirements"><h2 class="sd-h2">2. Requirements</h2><div class="sd-block-body">
      <ul>
        <li><code>get(key)</code> → value or miss; marks the key most-recently-used. <strong>O(1)</strong>.</li>
        <li><code>put(key,value)</code> → insert/update; evict LRU if over capacity. <strong>O(1)</strong>.</li>
        <li>Fixed capacity; thread-safe variant for shared use; optional TTL.</li>
      </ul>
    </div></section>

    <section class="sd-block" data-sec="internal"><h2 class="sd-h2">3. Internal Working — HashMap + Doubly Linked List</h2><div class="sd-block-body">
      <p>The O(1) trick combines two structures:</p>
      <ul>
        <li><strong>HashMap</strong> <code>key → node</code> for O(1) lookup.</li>
        <li><strong>Doubly linked list</strong> ordered by recency: head = most-recent, tail = least-recent. Moving a node or evicting the tail is O(1) because a node knows its neighbours.</li>
      </ul>
      <p>On <code>get</code>: look up node, unlink it, re-insert at head. On <code>put</code>: upsert node at head; if size &gt; capacity, drop the tail and remove its key from the map. Dummy head/tail sentinels remove null-checks.</p>
      <pre class="mermaid">graph LR
  H[head sentinel] --- A[MRU] --- B[...] --- C[LRU] --- T[tail sentinel]</pre>
    </div></section>

    <section class="sd-block" data-sec="class-diagram"><h2 class="sd-h2">4. Class Diagram</h2><div class="sd-block-body">
      <pre class="mermaid">classDiagram
  class LRUCache~K,V~ { -int capacity; -Map map; -Node head; -Node tail; +get(K) V; +put(K,V) }
  class Node~K,V~ { K key; V value; Node prev; Node next }
  LRUCache --> Node</pre>
    </div></section>

    <section class="sd-block" data-sec="java"><h2 class="sd-h2">5. Complete Java Implementation (O(1), generic)</h2><div class="sd-block-body">
      <pre><code class="language-java">public class LRUCache&lt;K, V&gt; {
    private static final class Node&lt;K, V&gt; {
        K key; V value; Node&lt;K, V&gt; prev, next;
        Node(K k, V v) { key = k; value = v; }
    }
    private final int capacity;
    private final java.util.Map&lt;K, Node&lt;K, V&gt;&gt; map = new java.util.HashMap&lt;&gt;();
    private final Node&lt;K, V&gt; head = new Node&lt;&gt;(null, null); // MRU side
    private final Node&lt;K, V&gt; tail = new Node&lt;&gt;(null, null); // LRU side

    public LRUCache(int capacity) {
        if (capacity &lt;= 0) throw new IllegalArgumentException("capacity must be &gt; 0");
        this.capacity = capacity;
        head.next = tail; tail.prev = head;
    }
    public V get(K key) {
        Node&lt;K, V&gt; n = map.get(key);
        if (n == null) return null;
        moveToFront(n);
        return n.value;
    }
    public void put(K key, V value) {
        Node&lt;K, V&gt; n = map.get(key);
        if (n != null) { n.value = value; moveToFront(n); return; }
        Node&lt;K, V&gt; node = new Node&lt;&gt;(key, value);
        map.put(key, node); addFront(node);
        if (map.size() &gt; capacity) {           // evict LRU
            Node&lt;K, V&gt; lru = tail.prev;
            remove(lru); map.remove(lru.key);
        }
    }
    private void addFront(Node&lt;K, V&gt; n){ n.prev=head; n.next=head.next; head.next.prev=n; head.next=n; }
    private void remove(Node&lt;K, V&gt; n){ n.prev.next=n.next; n.next.prev=n.prev; }
    private void moveToFront(Node&lt;K, V&gt; n){ remove(n); addFront(n); }
}</code></pre>

      <h4>Alternative: LinkedHashMap (production-quick)</h4>
      <pre><code class="language-java">public class LruLinkedHashMap&lt;K, V&gt; extends java.util.LinkedHashMap&lt;K, V&gt; {
    private final int capacity;
    public LruLinkedHashMap(int capacity) {
        super(16, 0.75f, true);            // accessOrder = true
        this.capacity = capacity;
    }
    @Override protected boolean removeEldestEntry(java.util.Map.Entry&lt;K, V&gt; eldest) {
        return size() &gt; capacity;          // auto-evicts LRU
    }
}</code></pre>

      <h4>Thread-safe variant</h4>
      <pre><code class="language-java">// Simplest correct option: wrap with a lock (segment for higher throughput).
public synchronized V getSafe(K k){ return get(k); }
public synchronized void putSafe(K k, V v){ put(k, v); }
// Production: prefer Caffeine (window-TinyLFU) for concurrency + better hit-rate.</code></pre>
    </div></section>

    <section class="sd-block" data-sec="sequence"><h2 class="sd-h2">6. Execution Flow</h2><div class="sd-block-body">
      <pre class="mermaid">sequenceDiagram
  participant C as Caller
  participant M as HashMap
  participant L as DoublyLinkedList
  C->>M: get(key)
  M-->>C: node (hit)
  C->>L: moveToFront(node)
  Note over C,L: put over capacity →
  C->>L: tail.prev = LRU node
  C->>M: remove(LRU.key)</pre>
    </div></section>

    <section class="sd-block" data-sec="dryrun"><h2 class="sd-h2">7. Dry Run & Edge Cases</h2><div class="sd-block-body">
      <p>capacity=2: <code>put(1,1)</code>, <code>put(2,2)</code>, <code>get(1)</code>→1 (1 now MRU), <code>put(3,3)</code> evicts key 2, <code>get(2)</code>→miss. ✓</p>
      <ul><li>Update existing key must <em>not</em> grow size or evict — move to front only.</li><li>capacity ≤ 0 rejected.</li><li>Eviction reads <code>tail.prev</code> (not <code>tail</code>, a sentinel).</li></ul>
    </div></section>

    <section class="sd-block" data-sec="hld"><h2 class="sd-h2">8. HLD — Distributed Caching</h2><div class="sd-block-body">
      <p>At scale you don't build LRU yourself — you use <strong>Redis</strong> with <code>maxmemory-policy allkeys-lru</code> (or <code>lfu</code>) as a shared cache in front of the DB.</p>
      <ul>
        <li><strong>Read-through / cache-aside</strong> (see <a href="#caching-patterns">Caching Patterns</a>): app checks Redis → on miss reads DB → populates cache.</li>
        <li><strong>Local + distributed (two-tier):</strong> Caffeine in-JVM (nanos) backed by Redis (network) to cut latency and Redis load.</li>
        <li><strong>Invalidation</strong> is the hard part: TTLs + event-based eviction via Kafka/pub-sub.</li>
      </ul>
      <pre class="mermaid">graph TD
  App --> L1[Caffeine L1]
  L1 -. miss .-> L2[(Redis L2 allkeys-lru)]
  L2 -. miss .-> DB[(PostgreSQL)]</pre>
    </div></section>

    <section class="sd-block" data-sec="compare"><h2 class="sd-h2">9. Comparison — Eviction Policies</h2><div class="sd-block-body">
      <table>
        <thead><tr><th>Policy</th><th>Evicts</th><th>Best for</th><th>Weakness</th></tr></thead>
        <tbody>
          <tr><td>LRU</td><td>Least recently used</td><td>Temporal locality</td><td>Scan/flood pollutes cache</td></tr>
          <tr><td>LFU</td><td>Least frequently used</td><td>Stable hot set</td><td>Slow to adapt; aging needed</td></tr>
          <tr><td>FIFO</td><td>Oldest inserted</td><td>Simplicity</td><td>Ignores access pattern</td></tr>
          <tr><td>TinyLFU (Caffeine)</td><td>Frequency-aware + recency window</td><td>General purpose, best hit-rate</td><td>More complex</td></tr>
        </tbody>
      </table>
    </div></section>

    <section class="sd-block" data-sec="pros-cons"><h2 class="sd-h2">10. Advantages, Disadvantages, Performance</h2><div class="sd-block-body">
      <h4>Advantages</h4><ul><li>O(1) get/put; simple; great under temporal locality.</li></ul>
      <h4>Disadvantages</h4><ul><li>Vulnerable to scans (a one-time full-table read evicts the hot set) — TinyLFU mitigates.</li><li>Per-entry overhead (node + map entry); not memory-free.</li></ul>
      <h4>Performance</h4><ul><li>get/put O(1); memory O(capacity). Thread-safe wrapper adds lock contention → shard or use Caffeine.</li></ul>
    </div></section>

    <section class="sd-block" data-sec="best"><h2 class="sd-h2">11. Best Practices & Common Mistakes</h2><div class="sd-block-body">
      <h4>Best practices</h4><ul><li>Use sentinel head/tail nodes to avoid null checks.</li><li>For production prefer <strong>Caffeine</strong>; only hand-roll for interviews/embedded.</li><li>Combine with TTL to bound staleness.</li></ul>
      <h4>Common mistakes</h4><ul><li>Forgetting to move a node to front on <code>get</code> (turns LRU into FIFO).</li><li>Evicting before inserting the new node (off-by-one capacity).</li><li>Using only a HashMap (can't find LRU in O(1)) or only a list (can't find a key in O(1)).</li></ul>
    </div></section>

    <section class="sd-block" data-sec="interview"><h2 class="sd-h2">12. Interview Q&amp;A & Follow-ups</h2><div class="sd-block-body">
      <details class="sd-faq"><summary>Why a doubly (not singly) linked list?</summary><div>Eviction and move-to-front need O(1) unlink, which requires the previous pointer. A singly linked list makes unlink O(n).</div></details>
      <details class="sd-faq"><summary>How do you make it thread-safe with high throughput?</summary><div>Segment/shard the cache by key hash (lock striping), or use Caffeine which uses ring buffers + amortized maintenance to avoid a global lock.</div></details>
      <details class="sd-faq"><summary>Add TTL per entry?</summary><div>Store an <code>expireAt</code> on the node; treat expired entries as misses on access and lazily evict, plus a periodic sweeper. Or delegate to Redis/Caffeine which support TTL natively.</div></details>
      <details class="sd-faq"><summary>LRU vs LFU — which for a CDN edge?</summary><div>Often LFU/TinyLFU: popular objects stay cached even if not just accessed, resisting scan pollution.</div></details>
      <details class="sd-faq"><summary>Implement LFU (follow-up, LC 460)?</summary><div>Map key→node plus map freq→DLL; track <code>minFreq</code> to evict in O(1).</div></details>
      <div class="sd-callout tip"><span class="sd-callout-l">Key takeaway</span>HashMap (find) + doubly linked list (order) = O(1) LRU. In production, reach for Caffeine/Redis.</div>
    </div></section>
  `,

  "rate-limiter-lld": `
    <section class="sd-block" data-sec="overview"><h2 class="sd-h2">1. Overview</h2><div class="sd-block-body">
      <p>A <strong>Rate Limiter</strong> caps how many requests a client may make in a time window, protecting services from abuse, accidental overload and cascading failure. As an LLD problem you design pluggable algorithms behind one interface; as a system-design problem you make it distributed and accurate across many nodes.</p>
      <p><strong>Where used:</strong> public APIs (Stripe, GitHub: <code>X-RateLimit-*</code> headers), login throttling, per-tenant quotas, the API gateway layer.</p>
    </div></section>
    <section class="sd-block" data-sec="requirements"><h2 class="sd-h2">2. Requirements</h2><div class="sd-block-body">
      <ul><li><code>boolean allow(clientId)</code> — accept or reject under a limit like "100 req / minute".</li><li>Pluggable algorithm (Token Bucket, Leaky Bucket, Fixed/Sliding Window).</li><li>Distributed &amp; atomic across nodes; low latency; configurable per client/tier.</li></ul>
    </div></section>
    <section class="sd-block" data-sec="algos"><h2 class="sd-h2">3. Algorithms Compared</h2><div class="sd-block-body">
      <table><thead><tr><th>Algorithm</th><th>Idea</th><th>Pros</th><th>Cons</th></tr></thead><tbody>
        <tr><td><strong>Token Bucket</strong></td><td>Tokens refill at rate r, each request takes one</td><td>Allows bursts; smooth; industry default</td><td>Two params (rate, capacity)</td></tr>
        <tr><td>Leaky Bucket</td><td>Queue drains at fixed rate</td><td>Smooths output</td><td>No bursts; queue memory</td></tr>
        <tr><td>Fixed Window</td><td>Counter per wall-clock window</td><td>Trivial</td><td>2× burst at window edges</td></tr>
        <tr><td>Sliding Window Log</td><td>Timestamps in window</td><td>Exact</td><td>Memory O(requests)</td></tr>
        <tr><td>Sliding Window Counter</td><td>Weighted prev+current window</td><td>Accurate &amp; cheap</td><td>Approximation</td></tr>
      </tbody></table>
    </div></section>
    <section class="sd-block" data-sec="class-diagram"><h2 class="sd-h2">4. Class Diagram</h2><div class="sd-block-body">
      <pre class="mermaid">classDiagram
  class RateLimiter { <<interface>> +allow(String clientId) boolean }
  class TokenBucketLimiter
  class SlidingWindowLimiter
  class RateLimiterFactory { +create(Algo, Config) RateLimiter }
  RateLimiter <|.. TokenBucketLimiter
  RateLimiter <|.. SlidingWindowLimiter
  RateLimiterFactory --> RateLimiter</pre>
    </div></section>
    <section class="sd-block" data-sec="java"><h2 class="sd-h2">5. Complete Java — Token Bucket (thread-safe, in-memory)</h2><div class="sd-block-body">
      <pre><code class="language-java">public interface RateLimiter { boolean allow(String clientId); }

public class TokenBucketLimiter implements RateLimiter {
    private final long capacity;        // max burst
    private final double refillPerSec;  // tokens added per second
    private final java.util.concurrent.ConcurrentHashMap&lt;String, Bucket&gt; buckets = new java.util.concurrent.ConcurrentHashMap&lt;&gt;();

    public TokenBucketLimiter(long capacity, double refillPerSec) {
        this.capacity = capacity; this.refillPerSec = refillPerSec;
    }
    private static final class Bucket { double tokens; long lastNanos; Bucket(double t,long n){tokens=t;lastNanos=n;} }

    @Override public boolean allow(String clientId) {
        Bucket b = buckets.computeIfAbsent(clientId, k -&gt; new Bucket(capacity, System.nanoTime()));
        synchronized (b) {                              // lock per-bucket, not global
            long now = System.nanoTime();
            double elapsedSec = (now - b.lastNanos) / 1_000_000_000.0;
            b.tokens = Math.min(capacity, b.tokens + elapsedSec * refillPerSec); // lazy refill
            b.lastNanos = now;
            if (b.tokens &gt;= 1) { b.tokens -= 1; return true; }
            return false;
        }
    }
}</code></pre>
      <h4>Distributed Token Bucket — Redis Lua (atomic)</h4>
      <pre><code class="language-java">// KEYS[1]=bucket key  ARGV: capacity, refillPerSec, now(ms), requested
// Returns 1 if allowed, 0 if throttled. Atomic = no race across nodes.
String LUA = """
  local b = redis.call('HMGET', KEYS[1], 'tokens', 'ts')
  local cap=tonumber(ARGV[1]); local rate=tonumber(ARGV[2])
  local now=tonumber(ARGV[3]); local need=tonumber(ARGV[4])
  local tokens = tonumber(b[1]); local ts = tonumber(b[2])
  if tokens==nil then tokens=cap; ts=now end
  tokens = math.min(cap, tokens + (now-ts)/1000.0*rate)
  local allowed = 0
  if tokens &gt;= need then tokens = tokens - need; allowed = 1 end
  redis.call('HMSET', KEYS[1], 'tokens', tokens, 'ts', now)
  redis.call('PEXPIRE', KEYS[1], 60000)
  return allowed
  """;
// Execute with redisTemplate.execute(new DefaultRedisScript&lt;&gt;(LUA, Long.class), keys, args)</code></pre>
    </div></section>
    <section class="sd-block" data-sec="spring"><h2 class="sd-h2">6. Spring Boot Integration (filter)</h2><div class="sd-block-body">
      <pre><code class="language-java">@Component
public class RateLimitFilter extends org.springframework.web.filter.OncePerRequestFilter {
    private final RateLimiter limiter;
    public RateLimitFilter(RateLimiter limiter){ this.limiter = limiter; }
    @Override protected void doFilterInternal(jakarta.servlet.http.HttpServletRequest req,
            jakarta.servlet.http.HttpServletResponse res, jakarta.servlet.FilterChain chain)
            throws java.io.IOException, jakarta.servlet.ServletException {
        String client = req.getHeader("X-API-Key");
        if (client != null &amp;&amp; !limiter.allow(client)) {
            res.setStatus(429);                                  // Too Many Requests
            res.setHeader("Retry-After", "1");
            res.getWriter().write("{\\"error\\":\\"rate_limited\\"}");
            return;
        }
        chain.doFilter(req, res);
    }
}</code></pre>
      <div class="sd-callout info"><span class="sd-callout-l">Note</span>Production: prefer <strong>Bucket4j</strong> (JVM or Redis-backed) or the API gateway's built-in limiter rather than hand-rolling.</div>
    </div></section>
    <section class="sd-block" data-sec="hld"><h2 class="sd-h2">7. HLD — Distributed &amp; Accurate</h2><div class="sd-block-body">
      <p>Per-node in-memory limiters over-admit by a factor of N nodes. Centralize counters in <strong>Redis</strong> with an atomic Lua script (single round trip, no race). Place the limiter at the <a href="#api-gateway">API Gateway</a> so backends stay clean.</p>
      <pre class="mermaid">graph TD
  C[Clients] --> GW[API Gateway + Rate Limiter]
  GW --> R[(Redis: token buckets, Lua)]
  GW -->|allowed| S[Services]
  GW -->|429 + Retry-After| C</pre>
    </div></section>
    <section class="sd-block" data-sec="best"><h2 class="sd-h2">8. Best Practices & Common Mistakes</h2><div class="sd-block-body">
      <h4>Best practices</h4><ul><li>Return <code>429</code> with <code>Retry-After</code> and <code>X-RateLimit-Remaining</code> headers.</li><li>Lazy refill (compute tokens on access) — no background timers.</li><li>Per-bucket locking or atomic Redis ops; never a global lock.</li><li>Tiered limits per plan; fail-open vs fail-closed decision documented.</li></ul>
      <h4>Common mistakes</h4><ul><li>Fixed-window edge bursts (2× at boundary) — use sliding window.</li><li>In-memory limiter behind a load balancer → inconsistent limits.</li><li>Non-atomic read-modify-write in Redis (use Lua/INCR with TTL).</li></ul>
    </div></section>
    <section class="sd-block" data-sec="interview"><h2 class="sd-h2">9. Interview Q&amp;A</h2><div class="sd-block-body">
      <details class="sd-faq"><summary>Token vs Leaky bucket?</summary><div>Token bucket allows controlled bursts (tokens accumulate up to capacity); leaky bucket enforces a strictly smooth output rate via a draining queue. APIs usually want bursts → token bucket.</div></details>
      <details class="sd-faq"><summary>How to make it accurate across nodes?</summary><div>Centralize state in Redis and mutate atomically (Lua or <code>INCR</code>+<code>EXPIRE</code>). Optionally a local pre-check to save round trips.</div></details>
      <details class="sd-faq"><summary>Fail-open or fail-closed if Redis is down?</summary><div>Trade-off: fail-open preserves availability (risk overload), fail-closed protects the backend (risk false 429s). Often fail-open for read APIs, fail-closed for expensive/abuse-prone ones.</div></details>
      <div class="sd-callout tip"><span class="sd-callout-l">Key takeaway</span>One <code>RateLimiter</code> interface, swappable algorithms (Strategy), atomic distributed state in Redis, enforced at the gateway.</div>
    </div></section>
  `,

  "splitwise": `
    <section class="sd-block" data-sec="overview"><h2 class="sd-h2">1. Overview</h2><div class="sd-block-body">
      <p><strong>Splitwise</strong> tracks shared expenses within groups and computes who owes whom, minimizing the number of settlement transactions. It tests money modelling (use integers/<code>BigDecimal</code>, never <code>double</code>), split strategies, and a greedy debt-simplification algorithm.</p>
    </div></section>
    <section class="sd-block" data-sec="requirements"><h2 class="sd-h2">2. Requirements</h2><div class="sd-block-body">
      <ul><li>Users &amp; groups; add an expense paid by one (or more) and split EQUAL / EXACT / PERCENT.</li><li>Maintain a balance sheet (net per user); show simplified settlements.</li><li>Money-safe arithmetic; splits must sum exactly to the total.</li></ul>
    </div></section>
    <section class="sd-block" data-sec="design"><h2 class="sd-h2">3. Design — Patterns & SOLID</h2><div class="sd-block-body">
      <ul><li><strong>Strategy</strong> for split types (<code>SplitStrategy</code>: Equal/Exact/Percent).</li><li><strong>Factory</strong> to build splits from request.</li><li>Balance sheet as <code>Map&lt;UserPair, BigDecimal&gt;</code> or net-balance map.</li><li>SRP: <code>ExpenseService</code> records, <code>BalanceSheet</code> aggregates, <code>SettlementService</code> simplifies.</li></ul>
      <pre class="mermaid">classDiagram
  class User { String id; String name }
  class Expense { String id; User paidBy; BigDecimal amount; List~Split~ splits }
  class Split { User user; BigDecimal amount }
  class SplitStrategy { <<interface>> +split(amount, participants, meta) List~Split~ }
  class BalanceSheet { +apply(Expense); +netBalances() Map }
  Expense --> Split
  SplitStrategy <|.. EqualSplit
  SplitStrategy <|.. ExactSplit
  SplitStrategy <|.. PercentSplit</pre>
    </div></section>
    <section class="sd-block" data-sec="java"><h2 class="sd-h2">4. Complete Java Implementation</h2><div class="sd-block-body">
      <pre><code class="language-java">public record Split(String userId, java.math.BigDecimal amount) {}

public interface SplitStrategy {
    java.util.List&lt;Split&gt; split(java.math.BigDecimal total, java.util.List&lt;String&gt; users, java.util.List&lt;java.math.BigDecimal&gt; meta);
}
public class EqualSplit implements SplitStrategy {
    public java.util.List&lt;Split&gt; split(java.math.BigDecimal total, java.util.List&lt;String&gt; users, java.util.List&lt;java.math.BigDecimal&gt; meta) {
        int n = users.size();
        java.math.BigDecimal each = total.divide(new java.math.BigDecimal(n), 2, java.math.RoundingMode.DOWN);
        java.util.List&lt;Split&gt; res = new java.util.ArrayList&lt;&gt;();
        java.math.BigDecimal acc = java.math.BigDecimal.ZERO;
        for (int i = 0; i &lt; n; i++) {
            java.math.BigDecimal amt = (i == n - 1) ? total.subtract(acc) : each; // last absorbs rounding
            res.add(new Split(users.get(i), amt)); acc = acc.add(each);
        }
        return res;
    }
}

public class BalanceSheet {
    // net[user] &gt; 0 means others owe this user; &lt; 0 means user owes
    private final java.util.Map&lt;String, java.math.BigDecimal&gt; net = new java.util.concurrent.ConcurrentHashMap&lt;&gt;();
    public synchronized void apply(String paidBy, java.util.List&lt;Split&gt; splits) {
        for (Split s : splits) {
            if (s.userId().equals(paidBy)) continue;
            net.merge(paidBy, s.amount(), java.math.BigDecimal::add);          // payer is owed
            net.merge(s.userId(), s.amount().negate(), java.math.BigDecimal::add); // debtor owes
        }
    }
    public java.util.Map&lt;String, java.math.BigDecimal&gt; netBalances(){ return java.util.Map.copyOf(net); }
}</code></pre>
      <h4>Debt simplification (greedy min-cash-flow)</h4>
      <pre><code class="language-java">public class SettlementService {
    public record Transfer(String from, String to, java.math.BigDecimal amount) {}
    public java.util.List&lt;Transfer&gt; simplify(java.util.Map&lt;String, java.math.BigDecimal&gt; net) {
        var creditors = new java.util.PriorityQueue&lt;Map.Entry&lt;String,java.math.BigDecimal&gt;&gt;((a,b)-&gt;b.getValue().compareTo(a.getValue()));
        var debtors   = new java.util.PriorityQueue&lt;Map.Entry&lt;String,java.math.BigDecimal&gt;&gt;((a,b)-&gt;a.getValue().compareTo(b.getValue()));
        net.forEach((u,v)-&gt;{ if(v.signum()&gt;0) creditors.add(Map.entry(u,v)); else if(v.signum()&lt;0) debtors.add(Map.entry(u,v)); });
        var res = new java.util.ArrayList&lt;Transfer&gt;();
        while(!creditors.isEmpty() &amp;&amp; !debtors.isEmpty()){
            var c = creditors.poll(); var d = debtors.poll();
            java.math.BigDecimal pay = c.getValue().min(d.getValue().abs());
            res.add(new Transfer(d.getKey(), c.getKey(), pay));
            java.math.BigDecimal cl = c.getValue().subtract(pay), dl = d.getValue().add(pay);
            if(cl.signum()&gt;0) creditors.add(Map.entry(c.getKey(), cl));
            if(dl.signum()&lt;0) debtors.add(Map.entry(d.getKey(), dl));
        }
        return res;
    }
}</code></pre>
    </div></section>
    <section class="sd-block" data-sec="edge"><h2 class="sd-h2">5. Money & Edge Cases</h2><div class="sd-block-body">
      <ul><li><strong>Never use <code>double</code></strong> for money — use <code>BigDecimal</code> (or integer minor units / cents).</li><li>Rounding: distribute the remainder to the last participant so splits sum exactly.</li><li>Self-payment ignored; percent splits must total 100; exact splits must sum to total (validate).</li><li>Concurrency: settle/apply under a per-group lock to avoid lost updates.</li></ul>
    </div></section>
    <section class="sd-block" data-sec="hld"><h2 class="sd-h2">6. HLD</h2><div class="sd-block-body">
      <p>Expenses in PostgreSQL (immutable ledger rows), balances cached in Redis, settlement notifications via Kafka → email/push. Idempotent expense creation (client-supplied key) avoids double counting on retry.</p>
    </div></section>
    <section class="sd-block" data-sec="interview"><h2 class="sd-h2">7. Interview Q&amp;A</h2><div class="sd-block-body">
      <details class="sd-faq"><summary>Why BigDecimal over double?</summary><div><code>double</code> can't represent 0.1 exactly → cents drift. <code>BigDecimal</code> with explicit scale + RoundingMode is exact and auditable.</div></details>
      <details class="sd-faq"><summary>How do you minimize the number of settlements?</summary><div>Compute each user's net balance, then greedily match the largest creditor with the largest debtor (two heaps). It's a heuristic (the exact min is NP-hard) but near-optimal in practice.</div></details>
      <details class="sd-faq"><summary>How to keep the ledger correct under concurrency/retries?</summary><div>Append-only expense rows + idempotency key; recompute balances from the ledger or update atomically under a per-group lock/transaction.</div></details>
      <div class="sd-callout tip"><span class="sd-callout-l">Key takeaway</span>Strategy for splits + BigDecimal money + greedy two-heap settlement is the winning structure.</div>
    </div></section>
  `,

  "elevator": `
    <section class="sd-block" data-sec="overview"><h2 class="sd-h2">1. Overview</h2><div class="sd-block-body">
      <p>The <strong>Elevator (Lift) System</strong> models one or more cars serving floor requests with a scheduling policy. It exercises the <strong>State pattern</strong> (Idle/Moving/Door states), request scheduling (SCAN/LOOK), and concurrency between button presses and car movement.</p>
    </div></section>
    <section class="sd-block" data-sec="requirements"><h2 class="sd-h2">2. Requirements</h2><div class="sd-block-body">
      <ul><li>External (hall) requests with direction; internal (car) requests for a destination floor.</li><li>Multiple cars; a dispatcher assigns requests; cars move efficiently (no needless reversals).</li><li>Door open/close, capacity, emergency stop.</li></ul>
    </div></section>
    <section class="sd-block" data-sec="design"><h2 class="sd-h2">3. Design — State + Strategy</h2><div class="sd-block-body">
      <ul><li><strong>State pattern:</strong> <code>ElevatorState</code> = Idle / MovingUp / MovingDown / DoorOpen; transitions encapsulated.</li><li><strong>Strategy:</strong> <code>SchedulingStrategy</code> (LOOK/SCAN, nearest-car dispatch).</li><li>Two sorted sets per car: up-requests (min-heap) and down-requests (max-heap) → LOOK algorithm.</li></ul>
      <pre class="mermaid">stateDiagram-v2
  [*] --> Idle
  Idle --> MovingUp: request above
  Idle --> MovingDown: request below
  MovingUp --> DoorOpen: reached target
  MovingDown --> DoorOpen: reached target
  DoorOpen --> MovingUp: more above
  DoorOpen --> MovingDown: more below
  DoorOpen --> Idle: no requests</pre>
    </div></section>
    <section class="sd-block" data-sec="java"><h2 class="sd-h2">4. Complete Java — LOOK scheduling, one car</h2><div class="sd-block-body">
      <pre><code class="language-java">public enum Direction { UP, DOWN, IDLE }

public class Elevator {
    private int currentFloor = 0;
    private Direction direction = Direction.IDLE;
    // up requests served ascending, down requests served descending
    private final java.util.TreeSet&lt;Integer&gt; up   = new java.util.TreeSet&lt;&gt;();
    private final java.util.TreeSet&lt;Integer&gt; down = new java.util.TreeSet&lt;&gt;(java.util.Comparator.reverseOrder());
    private final Object lock = new Object();

    public void request(int floor) {
        synchronized (lock) {
            if (floor &gt; currentFloor) up.add(floor);
            else if (floor &lt; currentFloor) down.add(floor);
            if (direction == Direction.IDLE)
                direction = floor &gt; currentFloor ? Direction.UP : Direction.DOWN;
            lock.notifyAll();
        }
    }
    /** One movement step (called by the car's run loop). */
    public void step() {
        synchronized (lock) {
            if (direction == Direction.UP) {
                Integer next = up.ceiling(currentFloor);
                if (next == null) { switchOrIdle(); return; }
                currentFloor = next; up.remove(next); openDoor();
                if (up.isEmpty()) switchOrIdle();
            } else if (direction == Direction.DOWN) {
                Integer next = down.floor(currentFloor);
                if (next == null) { switchOrIdle(); return; }
                currentFloor = next; down.remove(next); openDoor();
                if (down.isEmpty()) switchOrIdle();
            }
        }
    }
    private void switchOrIdle() {              // LOOK: reverse only if other side has work
        if (direction == Direction.UP &amp;&amp; !down.isEmpty()) direction = Direction.DOWN;
        else if (direction == Direction.DOWN &amp;&amp; !up.isEmpty()) direction = Direction.UP;
        else direction = Direction.IDLE;
    }
    private void openDoor() { /* open, dwell, close */ }
    public int getCurrentFloor(){ return currentFloor; }
    public Direction getDirection(){ return direction; }
}</code></pre>
      <h4>Multi-car dispatcher (nearest suitable car)</h4>
      <pre><code class="language-java">public class ElevatorController {
    private final java.util.List&lt;Elevator&gt; cars;
    public ElevatorController(java.util.List&lt;Elevator&gt; cars){ this.cars = cars; }
    public void hallRequest(int floor, Direction dir) {
        Elevator best = cars.stream()
            .min(java.util.Comparator.comparingInt(c -&gt; cost(c, floor, dir)))
            .orElseThrow();
        best.request(floor);
    }
    private int cost(Elevator c, int floor, Direction dir) {
        int dist = Math.abs(c.getCurrentFloor() - floor);
        boolean sameDir = c.getDirection() == dir || c.getDirection() == Direction.IDLE;
        return sameDir ? dist : dist + 1000;   // penalize cars heading the other way
    }
}</code></pre>
    </div></section>
    <section class="sd-block" data-sec="concurrency"><h2 class="sd-h2">5. Concurrency & Edge Cases</h2><div class="sd-block-body">
      <ul><li>Button presses (producers) and the car loop (consumer) share request sets → guard with a lock; <code>wait/notify</code> to sleep when idle.</li><li>Duplicate requests deduped by the <code>TreeSet</code>.</li><li>Capacity full → don't accept boarding; emergency stop → flush to a safe floor.</li><li>Starvation under heavy one-direction load → cap reversals / add aging.</li></ul>
    </div></section>
    <section class="sd-block" data-sec="interview"><h2 class="sd-h2">6. Interview Q&amp;A</h2><div class="sd-block-body">
      <details class="sd-faq"><summary>Which scheduling algorithm and why?</summary><div>LOOK (an optimization of SCAN/elevator algorithm): serve all requests in the current direction, then reverse — only as far as there are requests. Minimizes travel and avoids needless full sweeps.</div></details>
      <details class="sd-faq"><summary>Why the State pattern?</summary><div>Behaviour differs per state (Idle/Moving/DoorOpen) and transitions are well-defined; State avoids a giant <code>if/switch</code> and keeps each state's rules isolated (OCP).</div></details>
      <details class="sd-faq"><summary>How do you dispatch among multiple cars?</summary><div>A controller scores each car by distance + direction compatibility (and load), assigning the lowest-cost car — like ride dispatch.</div></details>
      <div class="sd-callout tip"><span class="sd-callout-l">Key takeaway</span>State pattern + LOOK scheduling + lock/notify between buttons and the car loop.</div>
    </div></section>
  `,

  "bookmyshow": `
    <section class="sd-block" data-sec="overview"><h2 class="sd-h2">1. Overview</h2><div class="sd-block-body">
      <p><strong>BookMyShow / Movie Ticket Booking</strong> lets users browse shows and book seats. The crux is <strong>concurrent seat reservation</strong>: two users must never book the same seat. It tests locking/reservation-with-TTL, payment flow, and a clean domain model.</p>
    </div></section>
    <section class="sd-block" data-sec="requirements"><h2 class="sd-h2">2. Requirements</h2><div class="sd-block-body">
      <ul><li>Cities → cinemas → screens → shows; each show has a seat map.</li><li>Search shows; select seats; <strong>hold</strong> seats during payment (TTL); confirm or auto-release.</li><li>No double-booking under high concurrency; payment + booking atomic.</li></ul>
    </div></section>
    <section class="sd-block" data-sec="design"><h2 class="sd-h2">3. Design — Entities & Patterns</h2><div class="sd-block-body">
      <pre class="mermaid">classDiagram
  class Show { String id; Movie movie; Screen screen; Instant startTime; Map~String,SeatStatus~ seatStatus }
  class Booking { String id; String userId; Show show; List~String~ seats; BookingStatus status }
  class SeatLockService { +lock(show, seats, user) boolean; +release(show, seats); +confirm(show, seats) }
  Show --> Booking</pre>
      <p><strong>Seat states:</strong> AVAILABLE → HELD (with expiry) → BOOKED. <strong>Patterns:</strong> State (seat lifecycle), Strategy (pricing), Singleton service beans, Observer (notify on booking).</p>
    </div></section>
    <section class="sd-block" data-sec="java"><h2 class="sd-h2">4. Complete Java — Seat hold with TTL</h2><div class="sd-block-body">
      <pre><code class="language-java">public enum SeatStatus { AVAILABLE, HELD, BOOKED }

public class SeatLockService {
    private record Hold(String userId, long expiresAt) {}
    private final java.util.Map&lt;String, java.util.Map&lt;String, Hold&gt;&gt; holds = new java.util.concurrent.ConcurrentHashMap&lt;&gt;();
    private final long ttlMillis;
    public SeatLockService(long ttlMillis){ this.ttlMillis = ttlMillis; }

    /** Atomically hold ALL requested seats or none (all-or-nothing). */
    public synchronized boolean hold(String showId, java.util.List&lt;String&gt; seats, String userId) {
        var map = holds.computeIfAbsent(showId, k -&gt; new java.util.HashMap&lt;&gt;());
        long now = System.currentTimeMillis();
        for (String s : seats) {                 // check all are free first
            Hold h = map.get(s);
            if (h != null &amp;&amp; h.expiresAt() &gt; now) return false; // actively held
        }
        for (String s : seats) map.put(s, new Hold(userId, now + ttlMillis));
        return true;
    }
    public synchronized void confirm(String showId, java.util.List&lt;String&gt; seats, String userId) {
        var map = holds.getOrDefault(showId, java.util.Map.of());
        for (String s : seats) {
            Hold h = map.get(s);
            if (h == null || !h.userId().equals(userId) || h.expiresAt() &lt; System.currentTimeMillis())
                throw new IllegalStateException("Hold expired for seat " + s);
        }
        // mark BOOKED in DB within the same transaction, then drop holds
        seats.forEach(map::remove);
    }
    public synchronized void release(String showId, java.util.List&lt;String&gt; seats) {
        var map = holds.get(showId); if (map != null) seats.forEach(map::remove);
    }
}</code></pre>
      <h4>Production: Redis-backed hold (multi-node, auto-expiry)</h4>
      <pre><code class="language-java">// SET seat:{show}:{seat} {userId} NX PX 120000   → NX = only if absent (atomic claim)
// Booking confirm: a transaction/Lua that verifies all holds belong to user, then writes BOOKED.
// TTL auto-releases abandoned carts without a sweeper.</code></pre>
    </div></section>
    <section class="sd-block" data-sec="sequence"><h2 class="sd-h2">5. Booking Sequence</h2><div class="sd-block-body">
      <pre class="mermaid">sequenceDiagram
  participant U as User
  participant B as BookingService
  participant L as SeatLock(Redis)
  participant P as PaymentGateway
  U->>B: select seats
  B->>L: hold(seats) NX PX 2m
  L-->>B: ok (held)
  U->>B: pay
  B->>P: charge (idempotent)
  P-->>B: success
  B->>L: confirm → mark BOOKED
  B-->>U: ticket
  Note over L: if no pay in 2m → TTL auto-releases</pre>
    </div></section>
    <section class="sd-block" data-sec="concurrency"><h2 class="sd-h2">6. Concurrency & Edge Cases</h2><div class="sd-block-body">
      <ul><li><strong>Double-booking:</strong> atomic claim (<code>SET NX</code> per seat or row lock <code>SELECT … FOR UPDATE</code>); all-or-nothing for multi-seat.</li><li><strong>Abandoned payment:</strong> TTL auto-releases the hold.</li><li><strong>Payment idempotency:</strong> use an idempotency key so retries don't double-charge (see <a href="#idempotency">Idempotency</a>).</li><li><strong>Hold expiry mid-payment:</strong> re-validate holds at confirm; fail gracefully.</li></ul>
      <div class="sd-callout warn"><span class="sd-callout-l">Trap</span>Holding a DB row lock for the entire payment duration kills throughput. Use a short-lived Redis hold + confirm transaction instead.</div>
    </div></section>
    <section class="sd-block" data-sec="hld"><h2 class="sd-h2">7. HLD</h2><div class="sd-block-body">
      <pre class="mermaid">graph TD
  U[Users] --> GW[API Gateway]
  GW --> BK[Booking Service]
  BK --> RS[(Redis: seat holds TTL)]
  BK --> DB[(PostgreSQL: bookings)]
  BK --> PAY[Payment Service - idempotent]
  BK --> K[Kafka: booking events]
  K --> NT[Notifications]</pre>
      <p>Seat maps cached; bookings in an RDBMS with a unique constraint on (show_id, seat) as the final safety net; events drive tickets/emails.</p>
    </div></section>
    <section class="sd-block" data-sec="interview"><h2 class="sd-h2">8. Interview Q&amp;A</h2><div class="sd-block-body">
      <details class="sd-faq"><summary>How do you guarantee no two users book the same seat?</summary><div>Atomic claim per seat (<code>SET NX PX</code> in Redis or <code>SELECT FOR UPDATE</code>) plus a DB unique constraint on (show, seat). The first writer wins; others get "seat unavailable".</div></details>
      <details class="sd-faq"><summary>How do you handle a user who never pays?</summary><div>Holds carry a TTL (e.g. 2 min). Redis expires them automatically; no background sweeper needed.</div></details>
      <details class="sd-faq"><summary>Why all-or-nothing for multiple seats?</summary><div>Users want adjacent seats together; partial holds create bad UX and orphan locks. Check all free, then claim all (or roll back).</div></details>
      <div class="sd-callout tip"><span class="sd-callout-l">Key takeaway</span>Short-lived atomic seat holds with TTL + idempotent payment + DB unique constraint = correct, scalable booking.</div>
    </div></section>
  `,

  "atm-machine": `
    <section class="sd-block" data-sec="overview"><h2 class="sd-h2">1. Overview</h2><div class="sd-block-body">
      <p>The <strong>ATM Machine</strong> models a state-driven workflow: insert card → authenticate (PIN) → select operation (withdraw/balance/deposit) → dispense cash → eject card. It's the textbook <strong>State pattern</strong> question, plus a cash-dispensing (greedy) algorithm and transaction integrity.</p>
    </div></section>
    <section class="sd-block" data-sec="requirements"><h2 class="sd-h2">2. Requirements</h2><div class="sd-block-body">
      <ul><li>Authenticate via card + PIN (limited attempts).</li><li>Withdraw (with denomination dispensing), check balance, deposit.</li><li>Atomic debit + dispense (never debit without cash); audit every transaction.</li></ul>
    </div></section>
    <section class="sd-block" data-sec="design"><h2 class="sd-h2">3. Design — State Pattern</h2><div class="sd-block-body">
      <pre class="mermaid">stateDiagram-v2
  [*] --> Idle
  Idle --> CardInserted: insertCard
  CardInserted --> Authenticated: correct PIN
  CardInserted --> Idle: wrong PIN x3 (retain card)
  Authenticated --> Dispensing: withdraw
  Dispensing --> Authenticated: success
  Authenticated --> Idle: ejectCard</pre>
      <p>Each state is a class implementing <code>ATMState</code> with the same operations; illegal operations are rejected per state (no giant switch). <strong>Strategy/Chain</strong> for denomination dispensing.</p>
    </div></section>
    <section class="sd-block" data-sec="java"><h2 class="sd-h2">4. Complete Java — State + cash dispenser</h2><div class="sd-block-body">
      <pre><code class="language-java">public interface ATMState {
    default void insertCard(ATM atm, Card c){ throw new IllegalStateException("Not allowed now"); }
    default void enterPin(ATM atm, String pin){ throw new IllegalStateException("Not allowed now"); }
    default void withdraw(ATM atm, int amount){ throw new IllegalStateException("Not allowed now"); }
    default void eject(ATM atm){ throw new IllegalStateException("Not allowed now"); }
}

public class IdleState implements ATMState {
    public void insertCard(ATM atm, Card c){ atm.setCard(c); atm.setState(new CardInsertedState()); }
}
public class CardInsertedState implements ATMState {
    public void enterPin(ATM atm, String pin){
        if (atm.getBank().validatePin(atm.getCard(), pin)) atm.setState(new AuthenticatedState());
        else if (atm.incPinFail() &gt;= 3) { atm.retainCard(); atm.setState(new IdleState()); }
    }
    public void eject(ATM atm){ atm.ejectCard(); atm.setState(new IdleState()); }
}
public class AuthenticatedState implements ATMState {
    public void withdraw(ATM atm, int amount){
        atm.setState(new DispensingState());
        atm.getDispenser().dispense(atm, amount);     // debits + dispenses atomically
        atm.setState(new AuthenticatedState());
    }
    public void eject(ATM atm){ atm.ejectCard(); atm.setState(new IdleState()); }
}
public class DispensingState implements ATMState {}  // transient

public class ATM {
    private ATMState state = new IdleState();
    private Card card; private int pinFails;
    private final BankService bank; private final CashDispenser dispenser;
    public ATM(BankService b, CashDispenser d){ this.bank=b; this.dispenser=d; }
    // delegate to current state
    public void insertCard(Card c){ state.insertCard(this, c); }
    public void enterPin(String p){ state.enterPin(this, p); }
    public void withdraw(int amt){ state.withdraw(this, amt); }
    public void eject(){ state.eject(this); }
    // accessors used by states
    void setState(ATMState s){ this.state=s; } void setCard(Card c){ this.card=c; pinFails=0; }
    Card getCard(){ return card; } int incPinFail(){ return ++pinFails; }
    BankService getBank(){ return bank; } CashDispenser getDispenser(){ return dispenser; }
    void ejectCard(){ /* return card */ } void retainCard(){ /* swallow card */ }
}</code></pre>
      <h4>Cash dispenser — greedy denominations + atomic debit</h4>
      <pre><code class="language-java">public class CashDispenser {
    private final java.util.TreeMap&lt;Integer,Integer&gt; inventory; // denom -&gt; count, descending
    public CashDispenser(java.util.TreeMap&lt;Integer,Integer&gt; inv){ this.inventory = inv; }

    public synchronized void dispense(ATM atm, int amount) {
        if (amount % 100 != 0) throw new IllegalArgumentException("Multiples of 100 only");
        var plan = plan(amount);                          // compute notes WITHOUT mutating
        if (plan == null) throw new IllegalStateException("Insufficient denominations");
        atm.getBank().debit(atm.getCard(), amount);       // debit first (transactional)
        plan.forEach((denom,cnt)-&gt; inventory.merge(denom,-cnt,Integer::sum)); // then commit notes
    }
    private java.util.Map&lt;Integer,Integer&gt; plan(int amount){
        var res = new java.util.LinkedHashMap&lt;Integer,Integer&gt;();
        for (var e : inventory.descendingMap().entrySet()){
            int denom=e.getKey(), avail=e.getValue();
            int use=Math.min(amount/denom, avail);
            if (use&gt;0){ res.put(denom,use); amount-=use*denom; }
        }
        return amount==0 ? res : null;                    // null = cannot make exact amount
    }
}</code></pre>
    </div></section>
    <section class="sd-block" data-sec="edge"><h2 class="sd-h2">5. Integrity & Edge Cases</h2><div class="sd-block-body">
      <ul><li><strong>Atomicity:</strong> compute a dispense plan first; debit within a DB transaction; only then decrement note inventory. If debit fails → dispense nothing.</li><li>Wrong PIN ×3 → retain card. Insufficient funds / notes → reject before debiting.</li><li>Concurrency on shared cash inventory → synchronize the dispenser (single physical machine).</li><li>Power loss mid-dispense → reconciliation/audit log + idempotent retry.</li></ul>
    </div></section>
    <section class="sd-block" data-sec="interview"><h2 class="sd-h2">6. Interview Q&amp;A</h2><div class="sd-block-body">
      <details class="sd-faq"><summary>Why the State pattern here?</summary><div>Each operation is valid only in certain states; State encapsulates allowed transitions per class and avoids a brittle mega-switch (OCP, SRP).</div></details>
      <details class="sd-faq"><summary>How do you avoid debiting without dispensing cash?</summary><div>Plan the notes first; perform the account debit inside a transaction; commit note inventory only after a successful debit. Any failure rolls back the debit.</div></details>
      <details class="sd-faq"><summary>How would you choose denominations?</summary><div>Greedy from largest to smallest works for canonical currency systems; for arbitrary denomination sets use DP (coin-change) to guarantee exact amounts.</div></details>
      <div class="sd-callout tip"><span class="sd-callout-l">Key takeaway</span>State pattern for the workflow + plan-then-debit-then-dispense for integrity.</div>
    </div></section>
  `,

  "food-delivery": `
    <section class="sd-block" data-sec="overview"><h2 class="sd-h2">1. Overview</h2><div class="sd-block-body">
      <p><strong>Food Delivery (Swiggy/DoorDash/Uber Eats)</strong> connects customers, restaurants and delivery partners. As LLD it's about modelling orders + an order <strong>state machine</strong> and matching/assigning delivery partners; as HLD it's location services, real-time tracking and surge.</p>
    </div></section>
    <section class="sd-block" data-sec="requirements"><h2 class="sd-h2">2. Requirements</h2><div class="sd-block-body">
      <ul><li>Browse restaurants/menus; place an order; pay.</li><li>Order lifecycle: PLACED → ACCEPTED → PREPARING → READY → PICKED_UP → DELIVERED (or CANCELLED).</li><li>Assign the nearest available delivery partner; live tracking; ratings.</li></ul>
    </div></section>
    <section class="sd-block" data-sec="design"><h2 class="sd-h2">3. Design — State + Strategy</h2><div class="sd-block-body">
      <pre class="mermaid">stateDiagram-v2
  [*] --> PLACED
  PLACED --> ACCEPTED: restaurant accepts
  PLACED --> CANCELLED: rejected/timeout
  ACCEPTED --> PREPARING
  PREPARING --> READY
  READY --> PICKED_UP: partner assigned
  PICKED_UP --> DELIVERED</pre>
      <p><strong>Patterns:</strong> State (order status with legal transitions), Strategy (partner-assignment: nearest / least-busy / batch), Observer (push status updates), Factory (payment methods).</p>
    </div></section>
    <section class="sd-block" data-sec="java"><h2 class="sd-h2">4. Complete Java — Order state machine + assignment</h2><div class="sd-block-body">
      <pre><code class="language-java">public enum OrderStatus {
    PLACED, ACCEPTED, PREPARING, READY, PICKED_UP, DELIVERED, CANCELLED;
    private static final java.util.Map&lt;OrderStatus, java.util.Set&lt;OrderStatus&gt;&gt; NEXT = java.util.Map.of(
        PLACED,    java.util.Set.of(ACCEPTED, CANCELLED),
        ACCEPTED,  java.util.Set.of(PREPARING, CANCELLED),
        PREPARING, java.util.Set.of(READY),
        READY,     java.util.Set.of(PICKED_UP),
        PICKED_UP, java.util.Set.of(DELIVERED),
        DELIVERED, java.util.Set.of(), CANCELLED, java.util.Set.of());
    public boolean canMoveTo(OrderStatus t){ return NEXT.getOrDefault(this, java.util.Set.of()).contains(t); }
}

public class Order {
    private final String id; private OrderStatus status = OrderStatus.PLACED;
    public synchronized void transitionTo(OrderStatus next) {
        if (!status.canMoveTo(next))
            throw new IllegalStateException("Illegal transition " + status + " -> " + next);
        status = next;                                  // emit event for observers here
    }
    public Order(String id){ this.id = id; }
    public OrderStatus getStatus(){ return status; }
}

public interface AssignmentStrategy { java.util.Optional&lt;Partner&gt; assign(java.util.List&lt;Partner&gt; partners, Location pickup); }
public class NearestPartnerStrategy implements AssignmentStrategy {
    public java.util.Optional&lt;Partner&gt; assign(java.util.List&lt;Partner&gt; partners, Location pickup) {
        return partners.stream()
            .filter(Partner::isAvailable)
            .min(java.util.Comparator.comparingDouble(p -&gt; p.getLocation().distanceTo(pickup)));
    }
}</code></pre>
    </div></section>
    <section class="sd-block" data-sec="hld"><h2 class="sd-h2">5. HLD — Real-time at scale</h2><div class="sd-block-body">
      <ul><li><strong>Geo-search</strong> for nearby restaurants/partners: Redis GEO / geohash / quadtree.</li><li><strong>Live tracking:</strong> partner app streams GPS over WebSocket/MQTT → location service → customer app.</li><li><strong>Order events</strong> on Kafka drive notifications, ETA, analytics; payments idempotent.</li><li><strong>Surge/ETA</strong> from demand-supply ratios per zone.</li></ul>
      <pre class="mermaid">graph TD
  C[Customer App] --> GW[API Gateway]
  GW --> OS[Order Service - state machine]
  GW --> GS[Geo/Matching Service]
  GS --> R[(Redis GEO)]
  OS --> K[Kafka order events]
  P[Partner App] -- GPS/WebSocket --> LOC[Location Service]
  LOC --> C</pre>
    </div></section>
    <section class="sd-block" data-sec="edge"><h2 class="sd-h2">6. Edge Cases & Concurrency</h2><div class="sd-block-body">
      <ul><li>Illegal status jumps blocked by the transition table.</li><li>Double assignment of one partner → atomic claim (mark busy via CAS/Redis NX).</li><li>Restaurant timeout → auto-cancel + refund (idempotent).</li><li>Partner goes offline mid-delivery → reassign.</li></ul>
    </div></section>
    <section class="sd-block" data-sec="interview"><h2 class="sd-h2">7. Interview Q&amp;A</h2><div class="sd-block-body">
      <details class="sd-faq"><summary>How do you model order status safely?</summary><div>A finite-state machine with an explicit allowed-transition table; reject illegal jumps. Emit a domain event on each transition for observers (notifications, analytics).</div></details>
      <details class="sd-faq"><summary>How do you find the nearest delivery partner fast?</summary><div>Index partner locations in Redis GEO (or a geohash/quadtree) and query a radius, then rank by distance/ETA/load. Pure linear scan doesn't scale to millions.</div></details>
      <details class="sd-faq"><summary>How is live tracking delivered?</summary><div>Partner app pushes GPS over a persistent connection (WebSocket/MQTT); a location service fans out to the customer's connection; see <a href="#websocket">WebSocket</a>.</div></details>
      <div class="sd-callout tip"><span class="sd-callout-l">Key takeaway</span>Order FSM + Strategy-based partner matching + geo-index + event-driven tracking.</div>
    </div></section>
  `,

  "logger": `
    <section class="sd-block" data-sec="overview"><h2 class="sd-h2">1. Overview</h2><div class="sd-block-body">
      <p>Designing a <strong>Logging framework</strong> (à la Log4j/SLF4J) tests layered design: levels, pluggable appenders/sinks, formatting, async buffering and thread-safety. It's a showcase for <strong>Chain of Responsibility</strong> (level routing), <strong>Strategy</strong> (formatters), <strong>Observer/Decorator</strong> (appenders) and the Singleton/Factory for logger creation.</p>
    </div></section>
    <section class="sd-block" data-sec="requirements"><h2 class="sd-h2">2. Requirements</h2><div class="sd-block-body">
      <ul><li>Levels: TRACE &lt; DEBUG &lt; INFO &lt; WARN &lt; ERROR; threshold filtering.</li><li>Multiple appenders (console, file, remote) selectable per logger.</li><li>Pluggable formatting; thread-safe; optional async (non-blocking) logging.</li></ul>
    </div></section>
    <section class="sd-block" data-sec="design"><h2 class="sd-h2">3. Design</h2><div class="sd-block-body">
      <pre class="mermaid">classDiagram
  class Logger { -Level threshold; -List~Appender~ appenders; +info(msg); +error(msg) }
  class Appender { <<interface>> +append(LogEvent) }
  class ConsoleAppender
  class FileAppender
  class AsyncAppender
  class Formatter { <<interface>> +format(LogEvent) String }
  Logger --> Appender
  Appender <|.. ConsoleAppender
  Appender <|.. FileAppender
  Appender <|.. AsyncAppender
  Appender --> Formatter</pre>
      <p><strong>Chain of Responsibility</strong> for level handlers; <strong>Decorator</strong> (<code>AsyncAppender</code> wraps any appender to add buffering); <strong>Strategy</strong> for <code>Formatter</code>.</p>
    </div></section>
    <section class="sd-block" data-sec="java"><h2 class="sd-h2">4. Complete Java Implementation</h2><div class="sd-block-body">
      <pre><code class="language-java">public enum Level { TRACE, DEBUG, INFO, WARN, ERROR }
public record LogEvent(Level level, String message, String thread, java.time.Instant ts) {}

public interface Formatter { String format(LogEvent e); }
public class SimpleFormatter implements Formatter {
    public String format(LogEvent e){ return e.ts()+" ["+e.thread()+"] "+e.level()+" - "+e.message(); }
}

public interface Appender extends AutoCloseable { void append(LogEvent e); default void close(){} }
public class ConsoleAppender implements Appender {
    private final Formatter fmt;
    public ConsoleAppender(Formatter f){ this.fmt=f; }
    public synchronized void append(LogEvent e){ System.out.println(fmt.format(e)); }
}
public class FileAppender implements Appender {
    private final Formatter fmt; private final java.io.BufferedWriter w;
    public FileAppender(Formatter f, String path) throws java.io.IOException {
        this.fmt=f; this.w=new java.io.BufferedWriter(new java.io.FileWriter(path, true));
    }
    public synchronized void append(LogEvent e){
        try { w.write(fmt.format(e)); w.newLine(); w.flush(); } catch(java.io.IOException ex){ /* fallback */ }
    }
    public void close(){ try{ w.close(); }catch(Exception ignored){} }
}
// Decorator: non-blocking buffering around ANY appender
public class AsyncAppender implements Appender {
    private final Appender delegate;
    private final java.util.concurrent.BlockingQueue&lt;LogEvent&gt; queue = new java.util.concurrent.LinkedBlockingQueue&lt;&gt;(10_000);
    private final Thread worker;
    private volatile boolean running = true;
    public AsyncAppender(Appender delegate){
        this.delegate = delegate;
        this.worker = new Thread(this::drain, "log-async"); worker.setDaemon(true); worker.start();
    }
    public void append(LogEvent e){ queue.offer(e); }    // never blocks the caller (drops on overflow)
    private void drain(){
        while(running || !queue.isEmpty()){
            try { LogEvent e = queue.poll(200, java.util.concurrent.TimeUnit.MILLISECONDS); if(e!=null) delegate.append(e); }
            catch(InterruptedException ie){ Thread.currentThread().interrupt(); }
        }
    }
    public void close(){ running=false; }
}

public class Logger {
    private final Level threshold;
    private final java.util.List&lt;Appender&gt; appenders;
    public Logger(Level threshold, java.util.List&lt;Appender&gt; appenders){ this.threshold=threshold; this.appenders=appenders; }
    public void log(Level level, String msg){
        if (level.ordinal() &lt; threshold.ordinal()) return;            // threshold filter
        LogEvent e = new LogEvent(level, msg, Thread.currentThread().getName(), java.time.Instant.now());
        for (Appender a : appenders) a.append(e);                     // fan-out
    }
    public void info(String m){ log(Level.INFO, m); }
    public void error(String m){ log(Level.ERROR, m); }
}</code></pre>
    </div></section>
    <section class="sd-block" data-sec="concurrency"><h2 class="sd-h2">5. Concurrency & Edge Cases</h2><div class="sd-block-body">
      <ul><li>Synchronize each appender's write (or use a single-consumer async queue) to avoid interleaved lines.</li><li><strong>Async backpressure:</strong> bounded queue — drop or block on overflow (policy choice).</li><li>Graceful shutdown must flush the async buffer (close hook).</li><li>File rotation by size/time to bound disk usage.</li></ul>
    </div></section>
    <section class="sd-block" data-sec="interview"><h2 class="sd-h2">6. Interview Q&amp;A</h2><div class="sd-block-body">
      <details class="sd-faq"><summary>How do you avoid logging slowing the request path?</summary><div>Wrap appenders in an <code>AsyncAppender</code> (Decorator) backed by a bounded queue + background worker. The request thread only enqueues. (Log4j2 uses LMAX Disruptor for this.)</div></details>
      <details class="sd-faq"><summary>How do levels filter messages?</summary><div>Compare the event level's ordinal against the logger threshold; below threshold returns early before any formatting/IO.</div></details>
      <details class="sd-faq"><summary>How to add a new sink (e.g., Kafka)?</summary><div>Implement <code>Appender</code> and add it — no change to <code>Logger</code> (OCP). It can be wrapped by <code>AsyncAppender</code> for buffering.</div></details>
      <div class="sd-callout tip"><span class="sd-callout-l">Key takeaway</span>Level threshold + pluggable appenders (Strategy/Decorator) + async buffering = a clean, extensible logger.</div>
    </div></section>
  `,

  "meeting-scheduler": `
    <section class="sd-block" data-sec="overview"><h2 class="sd-h2">1. Overview</h2><div class="sd-block-body">
      <p>The <strong>Meeting Scheduler / Calendar</strong> books meetings into rooms while preventing overlaps, finds free slots across attendees, and (classic) computes the <em>minimum number of rooms</em> needed — the interval-overlap problem. Tests interval algorithms + clean booking design.</p>
    </div></section>
    <section class="sd-block" data-sec="requirements"><h2 class="sd-h2">2. Requirements</h2><div class="sd-block-body">
      <ul><li>Book a room for [start,end); reject if it overlaps an existing booking.</li><li>Find available rooms / free slots for a set of attendees.</li><li>Min-rooms for a batch of meetings; send invites/notifications.</li></ul>
    </div></section>
    <section class="sd-block" data-sec="java"><h2 class="sd-h2">3. Complete Java — Booking + min-rooms</h2><div class="sd-block-body">
      <pre><code class="language-java">public record Interval(java.time.Instant start, java.time.Instant end) {
    boolean overlaps(Interval o){ return start.isBefore(o.end) &amp;&amp; o.start.isBefore(end); }
}

public class Room {
    private final String id;
    // bookings kept sorted by start for O(log n) overlap checks
    private final java.util.TreeMap&lt;java.time.Instant, Interval&gt; bookings = new java.util.TreeMap&lt;&gt;();
    public Room(String id){ this.id = id; }
    public synchronized boolean book(Interval slot){
        var floor = bookings.floorEntry(slot.start());          // latest booking starting ≤ slot.start
        var ceil  = bookings.ceilingEntry(slot.start());        // earliest booking starting ≥ slot.start
        if (floor != null &amp;&amp; floor.getValue().overlaps(slot)) return false;
        if (ceil  != null &amp;&amp; ceil.getValue().overlaps(slot))  return false;
        bookings.put(slot.start(), slot);
        return true;
    }
    public String getId(){ return id; }
}

public class SchedulerService {
    private final java.util.List&lt;Room&gt; rooms;
    public SchedulerService(java.util.List&lt;Room&gt; rooms){ this.rooms = rooms; }
    /** First room that accepts the slot. */
    public java.util.Optional&lt;Room&gt; schedule(Interval slot){
        for (Room r : rooms) if (r.book(slot)) return java.util.Optional.of(r);
        return java.util.Optional.empty();
    }
    /** Min rooms required for a batch (sweep line / two-heaps style). */
    public int minRooms(java.util.List&lt;Interval&gt; meetings){
        var starts = meetings.stream().map(Interval::start).sorted().toList();
        var ends   = meetings.stream().map(Interval::end).sorted().toList();
        int i=0,j=0,used=0,max=0;
        while(i&lt;starts.size()){
            if(!starts.get(i).isBefore(ends.get(j))){ used--; j++; }  // a meeting ended
            else { used++; max=Math.max(max,used); i++; }             // a meeting started
        }
        return max;
    }
}</code></pre>
    </div></section>
    <section class="sd-block" data-sec="diagram"><h2 class="sd-h2">4. Min-Rooms Intuition</h2><div class="sd-block-body">
      <p>Min rooms = maximum number of meetings overlapping at any instant. Sort starts and ends; sweep — a start needs a room, an end frees one; track the peak. This is identical to "Minimum Platforms" and "Meeting Rooms II".</p>
      <pre class="mermaid">graph LR
  S[sort starts] --> SW[sweep]
  E[sort ends] --> SW
  SW --> M[peak concurrent = min rooms]</pre>
    </div></section>
    <section class="sd-block" data-sec="edge"><h2 class="sd-h2">5. Edge Cases & Concurrency</h2><div class="sd-block-body">
      <ul><li>Half-open intervals [start,end) so back-to-back meetings (10:00–11:00, 11:00–12:00) don't conflict.</li><li>Time zones / DST — store UTC <code>Instant</code>, render in user TZ.</li><li>Concurrent booking of the same room → synchronize per room or use a DB exclusion constraint (PostgreSQL <code>tstzrange</code> + GiST <code>EXCLUDE</code>).</li></ul>
    </div></section>
    <section class="sd-block" data-sec="interview"><h2 class="sd-h2">6. Interview Q&amp;A</h2><div class="sd-block-body">
      <details class="sd-faq"><summary>How do you detect overlap efficiently?</summary><div>Keep bookings in a TreeMap sorted by start; check only the floor and ceiling neighbours of the new start — O(log n) rather than scanning all bookings.</div></details>
      <details class="sd-faq"><summary>Minimum rooms for N meetings?</summary><div>Sweep line over sorted starts/ends; the peak concurrency is the answer — O(n log n). Equivalent to a min-heap of end times.</div></details>
      <details class="sd-faq"><summary>How to enforce no-overlap at the DB level?</summary><div>PostgreSQL exclusion constraint on a <code>tstzrange</code> with <code>EXCLUDE USING gist (room_id WITH =, during WITH &amp;&amp;)</code> — the DB rejects overlapping inserts atomically.</div></details>
      <div class="sd-callout tip"><span class="sd-callout-l">Key takeaway</span>TreeMap neighbour-check for booking + sweep-line for min-rooms + DB exclusion constraint for correctness.</div>
    </div></section>
  `,

  "snake-ladder": `
    <section class="sd-block" data-sec="overview"><h2 class="sd-h2">1. Overview</h2><div class="sd-block-body">
      <p><strong>Snake &amp; Ladder</strong> is a turn-based board game: a warm-up LLD that exercises clean entity modelling (Board, Dice, Player, Jump), a game loop, and extensibility (multiple dice, board sizes, crocodiles/mines). Bonus: the shortest-game-with-min-dice variant is a BFS graph problem.</p>
    </div></section>
    <section class="sd-block" data-sec="requirements"><h2 class="sd-h2">2. Requirements</h2><div class="sd-block-body">
      <ul><li>N×N board (default 10×10 = 100 cells); snakes (down) and ladders (up).</li><li>2+ players take turns rolling dice; landing on a snake/ladder jumps; first to reach the last cell wins.</li><li>Configurable dice count, board size and entities.</li></ul>
    </div></section>
    <section class="sd-block" data-sec="java"><h2 class="sd-h2">3. Complete Java Implementation</h2><div class="sd-block-body">
      <pre><code class="language-java">public record Jump(int start, int end) {}   // ladder: end>start, snake: end&lt;start

public class Board {
    private final int size;                       // total cells (e.g. 100)
    private final java.util.Map&lt;Integer, Integer&gt; jumps = new java.util.HashMap&lt;&gt;();
    public Board(int size, java.util.List&lt;Jump&gt; js){
        this.size = size;
        for (Jump j : js) jumps.put(j.start(), j.end());
    }
    public int size(){ return size; }
    public int resolve(int pos){ return jumps.getOrDefault(pos, pos); } // apply snake/ladder
}

public class Dice {
    private final int count; private final java.util.Random rnd = new java.util.Random();
    public Dice(int count){ this.count = count; }
    public int roll(){ int s=0; for(int i=0;i&lt;count;i++) s+=1+rnd.nextInt(6); return s; }
}

public record Player(String name) { }

public class Game {
    private final Board board; private final Dice dice;
    private final java.util.Deque&lt;Player&gt; players = new java.util.ArrayDeque&lt;&gt;();
    private final java.util.Map&lt;String,Integer&gt; pos = new java.util.HashMap&lt;&gt;();
    public Game(Board b, Dice d, java.util.List&lt;Player&gt; ps){
        this.board=b; this.dice=d; ps.forEach(p-&gt;{ players.add(p); pos.put(p.name(),0); });
    }
    public Player play(){
        while(true){
            Player p = players.pollFirst();           // round-robin turn
            int roll = dice.roll();
            int target = pos.get(p.name()) + roll;
            if (target &lt;= board.size()){               // ignore overshoot
                target = board.resolve(target);       // snake/ladder
                pos.put(p.name(), target);
                if (target == board.size()) return p; // winner
            }
            players.addLast(p);
        }
    }
}</code></pre>
      <h4>Follow-up: minimum dice throws to win (BFS)</h4>
      <pre><code class="language-java">// Treat cells as graph nodes; from cell c you can reach c+1..c+6 (after jumps).
// BFS from 1 gives the minimum number of throws to reach cell N.
public int minThrows(int n, java.util.Map&lt;Integer,Integer&gt; jumps){
    boolean[] seen = new boolean[n+1];
    java.util.Queue&lt;int[]&gt; q = new java.util.ArrayDeque&lt;&gt;(); // {cell, throws}
    q.add(new int[]{1,0}); seen[1]=true;
    while(!q.isEmpty()){
        int[] cur=q.poll();
        if(cur[0]==n) return cur[1];
        for(int d=1; d&lt;=6 &amp;&amp; cur[0]+d&lt;=n; d++){
            int next = jumps.getOrDefault(cur[0]+d, cur[0]+d);
            if(!seen[next]){ seen[next]=true; q.add(new int[]{next, cur[1]+1}); }
        }
    }
    return -1;
}</code></pre>
    </div></section>
    <section class="sd-block" data-sec="design"><h2 class="sd-h2">4. Design Notes</h2><div class="sd-block-body">
      <ul><li><strong>SRP:</strong> Board (geometry+jumps), Dice (randomness), Game (turn loop) are separate.</li><li><strong>OCP:</strong> add "mines" or "crocodiles" as new <code>Jump</code>-like entities or a Cell strategy.</li><li><strong>Testability:</strong> inject a seeded/mock <code>Dice</code> for deterministic tests.</li></ul>
    </div></section>
    <section class="sd-block" data-sec="interview"><h2 class="sd-h2">5. Interview Q&amp;A</h2><div class="sd-block-body">
      <details class="sd-faq"><summary>How do you keep the design extensible?</summary><div>Separate Board/Dice/Game (SRP); represent jumps as data (a map) not code; allow configurable size/dice. New cell effects plug in without touching the game loop (OCP).</div></details>
      <details class="sd-faq"><summary>How do you make dice testable?</summary><div>Depend on a <code>Dice</code> abstraction and inject a deterministic/seeded implementation in tests (DIP).</div></details>
      <details class="sd-faq"><summary>Minimum throws to win?</summary><div>Model cells as a graph (edges to next 1–6 cells after applying jumps) and BFS from the start — unweighted shortest path.</div></details>
      <div class="sd-callout tip"><span class="sd-callout-l">Key takeaway</span>Clean SRP entities + jumps-as-data; the optimization twist is a BFS shortest-path.</div>
    </div></section>
  `

});

/* ════════════════════════════ CONCURRENCY & THREADING ════════════════════════════ */
Object.assign(window.SD_CONTENT, {

  "concurrency-basics": `
    <section class="sd-block" data-sec="overview"><h2 class="sd-h2">1. Overview</h2><div class="sd-block-body">
      <p><strong>Concurrency</strong> is structuring a program so multiple tasks make progress in overlapping time periods; <strong>parallelism</strong> is them literally running at the same instant on multiple cores. Java exposes this through threads, the <code>java.util.concurrent</code> toolkit and (since Java 21) virtual threads. Mastering it is non-negotiable for backend roles: every web server handles thousands of concurrent requests.</p>
      <div class="sd-callout info"><span class="sd-callout-l">Concurrency ≠ Parallelism</span>Concurrency is about <em>dealing with</em> many things at once (structure); parallelism is about <em>doing</em> many things at once (execution).</div>
    </div></section>
    <section class="sd-block" data-sec="theory"><h2 class="sd-h2">2. Core Concepts</h2><div class="sd-block-body">
      <ul>
        <li><strong>Process vs Thread:</strong> a process owns memory; threads share the process's heap but have their own stack &amp; program counter. Sharing heap is what makes threads fast and dangerous.</li>
        <li><strong>Race condition:</strong> result depends on thread interleaving (e.g. <code>count++</code> is read-modify-write, not atomic).</li>
        <li><strong>Critical section:</strong> code that must run by one thread at a time.</li>
        <li><strong>Mutual exclusion / locks:</strong> enforce one-at-a-time access.</li>
        <li><strong>Visibility:</strong> one thread's write may not be seen by another without a memory barrier (<code>volatile</code>, locks).</li>
        <li><strong>Atomicity:</strong> an operation that completes wholly or not at all.</li>
        <li><strong>Happens-before:</strong> the JMM ordering guarantee that makes writes visible across threads.</li>
      </ul>
    </div></section>
    <section class="sd-block" data-sec="lifecycle"><h2 class="sd-h2">3. Thread Lifecycle</h2><div class="sd-block-body">
      <pre class="mermaid">stateDiagram-v2
  [*] --> NEW
  NEW --> RUNNABLE: start()
  RUNNABLE --> RUNNING: scheduler picks
  RUNNING --> BLOCKED: wait for monitor lock
  RUNNING --> WAITING: wait()/join()
  RUNNING --> TIMED_WAITING: sleep(n)/wait(n)
  BLOCKED --> RUNNABLE
  WAITING --> RUNNABLE: notify()
  RUNNING --> TERMINATED: run() ends</pre>
    </div></section>
    <section class="sd-block" data-sec="java"><h2 class="sd-h2">4. Creating Threads (4 ways) + the race bug</h2><div class="sd-block-body">
      <pre><code class="language-java">// 1) Runnable (preferred over extending Thread — composition over inheritance)
Runnable task = () -&gt; System.out.println("on " + Thread.currentThread().getName());
new Thread(task, "worker-1").start();

// 2) Callable + ExecutorService (returns a value / exception)
java.util.concurrent.ExecutorService pool = java.util.concurrent.Executors.newFixedThreadPool(4);
java.util.concurrent.Future&lt;Integer&gt; f = pool.submit(() -&gt; 2 + 2);
int result = f.get();           // blocks until done
pool.shutdown();

// 3) CompletableFuture (async composition) — see its own topic
// 4) Virtual threads (Java 21) — Thread.ofVirtual().start(task)</code></pre>
      <h4>The classic race condition</h4>
      <pre><code class="language-java">class Counter {
    private int count = 0;
    void increment() { count++; }            // BUG: read-modify-write, not atomic
    int get() { return count; }
}
// 1000 threads × 1000 increments should be 1,000,000 — but you'll see less.
// Fixes: synchronized, AtomicInteger, or a lock.
class SafeCounter {
    private final java.util.concurrent.atomic.AtomicInteger count = new java.util.concurrent.atomic.AtomicInteger();
    void increment() { count.incrementAndGet(); }  // atomic CAS
    int get() { return count.get(); }
}</code></pre>
    </div></section>
    <section class="sd-block" data-sec="jmm"><h2 class="sd-h2">5. Java Memory Model (JMM) & happens-before</h2><div class="sd-block-body">
      <p>Each thread may cache variables in registers/CPU caches. The JMM defines when writes by one thread become visible to another. Key <strong>happens-before</strong> edges:</p>
      <ul>
        <li>Program order within a single thread.</li>
        <li><code>unlock</code> of a monitor happens-before a subsequent <code>lock</code>.</li>
        <li>A write to a <code>volatile</code> happens-before every subsequent read of it.</li>
        <li><code>Thread.start()</code> happens-before the started thread's actions; a thread's actions happen-before <code>join()</code> returns.</li>
      </ul>
      <div class="sd-callout warn"><span class="sd-callout-l">Trap</span>Without a happens-before edge, a thread can loop forever on a stale cached flag. <code>volatile</code> (or a lock) provides the edge.</div>
    </div></section>
    <section class="sd-block" data-sec="best"><h2 class="sd-h2">6. Best Practices & Common Mistakes</h2><div class="sd-block-body">
      <h4>Best practices</h4><ul><li>Prefer <code>java.util.concurrent</code> (executors, atomics, concurrent collections) over raw <code>synchronized</code>/<code>wait/notify</code>.</li><li>Prefer immutability — immutable objects are inherently thread-safe.</li><li>Minimize shared mutable state; confine state to one thread when possible.</li><li>Always name threads (debuggability) and shut down pools.</li></ul>
      <h4>Common mistakes</h4><ul><li>Assuming <code>count++</code> / <code>check-then-act</code> are atomic.</li><li>Calling <code>run()</code> instead of <code>start()</code> (runs on the current thread!).</li><li>Catching <code>InterruptedException</code> and swallowing it — restore the interrupt flag.</li></ul>
    </div></section>
    <section class="sd-block" data-sec="interview"><h2 class="sd-h2">7. Interview Q&amp;A</h2><div class="sd-block-body">
      <details class="sd-faq"><summary>Difference between concurrency and parallelism?</summary><div>Concurrency = managing multiple tasks with overlapping lifetimes (possibly on one core via time-slicing). Parallelism = executing simultaneously on multiple cores. Concurrency is a design property; parallelism is a runtime property.</div></details>
      <details class="sd-faq"><summary>Why is <code>count++</code> not thread-safe?</summary><div>It compiles to read → add → write. Two threads can read the same value, both increment, and one update is lost. Use <code>AtomicInteger</code> or a lock.</div></details>
      <details class="sd-faq"><summary>start() vs run()?</summary><div><code>start()</code> creates a new thread and invokes <code>run()</code> on it; calling <code>run()</code> directly executes synchronously on the caller's thread — no concurrency.</div></details>
      <details class="sd-faq"><summary>What is happens-before?</summary><div>A JMM guarantee that the effects of one action are visible/ordered before another. It's how you reason about visibility without knowing CPU cache details.</div></details>
      <div class="sd-callout tip"><span class="sd-callout-l">Key takeaway</span>Threads share the heap → race conditions &amp; visibility issues. The fixes are atomicity (atomics/CAS) and happens-before (locks/volatile). Prefer the high-level <code>j.u.c</code> toolkit.</div>
    </div></section>
  `,

  "thread-pools": `
    <section class="sd-block" data-sec="overview"><h2 class="sd-h2">1. Overview</h2><div class="sd-block-body">
      <p>A <strong>thread pool</strong> reuses a fixed set of worker threads to execute many tasks, avoiding the cost of creating a thread per task (~1 MB stack + OS scheduling). <code>ExecutorService</code> is the Java abstraction; <code>ThreadPoolExecutor</code> is the workhorse behind it. Every Spring Boot app, Tomcat, and async pipeline relies on pools.</p>
    </div></section>
    <section class="sd-block" data-sec="internal"><h2 class="sd-h2">2. Internal Working — ThreadPoolExecutor</h2><div class="sd-block-body">
      <p>Submitting a task follows a precise admission policy:</p>
      <ol>
        <li>If running threads &lt; <code>corePoolSize</code> → start a new core thread.</li>
        <li>Else try to enqueue into the <code>workQueue</code>.</li>
        <li>If the queue is full and threads &lt; <code>maximumPoolSize</code> → start a non-core thread.</li>
        <li>Else apply the <code>RejectedExecutionHandler</code>.</li>
        <li>Idle non-core threads die after <code>keepAliveTime</code>.</li>
      </ol>
      <pre class="mermaid">graph TD
  S[submit task] --> C{core threads free?}
  C -- yes --> R1[run on core thread]
  C -- no --> Q{queue has space?}
  Q -- yes --> EN[enqueue]
  Q -- no --> M{threads &lt; max?}
  M -- yes --> R2[start non-core thread]
  M -- no --> RJ[RejectedExecutionHandler]</pre>
    </div></section>
    <section class="sd-block" data-sec="java"><h2 class="sd-h2">3. Complete Java — explicit ThreadPoolExecutor</h2><div class="sd-block-body">
      <pre><code class="language-java">import java.util.concurrent.*;

ThreadPoolExecutor pool = new ThreadPoolExecutor(
    4,                                   // corePoolSize
    8,                                   // maximumPoolSize
    60L, TimeUnit.SECONDS,               // keepAlive for non-core threads
    new ArrayBlockingQueue&lt;&gt;(100),       // bounded queue (back-pressure!)
    new ThreadFactory() {                // named threads for debugging
        private int n = 0;
        public Thread newThread(Runnable r){ return new Thread(r, "app-worker-" + (n++)); }
    },
    new ThreadPoolExecutor.CallerRunsPolicy()  // rejection: run on caller (throttle)
);

Future&lt;Integer&gt; f = pool.submit(() -&gt; expensiveComputation());
pool.shutdown();                         // no new tasks; finish queued
if (!pool.awaitTermination(30, TimeUnit.SECONDS)) pool.shutdownNow();</code></pre>
      <div class="sd-callout warn"><span class="sd-callout-l">Avoid Executors factory methods in production</span><code>newFixedThreadPool</code>/<code>newCachedThreadPool</code> use an <strong>unbounded</strong> queue or unbounded threads → OOM / thread explosion under load. Always size a <strong>bounded</strong> queue and pool explicitly.</div>
    </div></section>
    <section class="sd-block" data-sec="sizing"><h2 class="sd-h2">4. Sizing & Rejection Policies</h2><div class="sd-block-body">
      <h4>Pool sizing rule of thumb</h4>
      <ul><li><strong>CPU-bound:</strong> threads ≈ number of cores (+1).</li><li><strong>IO-bound:</strong> threads ≈ cores × (1 + waitTime/computeTime). High wait → many threads (or virtual threads).</li></ul>
      <table><thead><tr><th>RejectedExecutionHandler</th><th>Behaviour</th></tr></thead><tbody>
        <tr><td>AbortPolicy (default)</td><td>Throws <code>RejectedExecutionException</code></td></tr>
        <tr><td>CallerRunsPolicy</td><td>Runs task on the submitting thread → natural back-pressure</td></tr>
        <tr><td>DiscardPolicy</td><td>Silently drops the task</td></tr>
        <tr><td>DiscardOldestPolicy</td><td>Drops the oldest queued task, retries</td></tr>
      </tbody></table>
    </div></section>
    <section class="sd-block" data-sec="spring"><h2 class="sd-h2">5. Spring Boot — @Async executor</h2><div class="sd-block-body">
      <pre><code class="language-java">@Configuration
@EnableAsync
public class AsyncConfig {
    @Bean("appExecutor")
    public java.util.concurrent.Executor appExecutor() {
        var ex = new org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor();
        ex.setCorePoolSize(4); ex.setMaxPoolSize(8); ex.setQueueCapacity(100);
        ex.setThreadNamePrefix("app-async-");
        ex.setRejectedExecutionHandler(new java.util.concurrent.ThreadPoolExecutor.CallerRunsPolicy());
        ex.initialize(); return ex;
    }
}
@Service class ReportService {
    @org.springframework.scheduling.annotation.Async("appExecutor")
    public java.util.concurrent.CompletableFuture&lt;String&gt; generate() {
        return java.util.concurrent.CompletableFuture.completedFuture("done");
    }
}</code></pre>
    </div></section>
    <section class="sd-block" data-sec="prod"><h2 class="sd-h2">6. Production Issues & Monitoring</h2><div class="sd-block-body">
      <ul><li><strong>Thread starvation / deadlock:</strong> a pooled task that blocks waiting on another task in the <em>same</em> pool can deadlock — use separate pools for dependent stages.</li><li><strong>Queue blow-up:</strong> unbounded queue hides overload until OOM. Bound it + monitor queue depth.</li><li><strong>Metrics:</strong> Micrometer exposes <code>executor.active</code>, <code>executor.queued</code>, <code>executor.completed</code> → Prometheus/Grafana alerts on queue depth &amp; rejections.</li></ul>
    </div></section>
    <section class="sd-block" data-sec="interview"><h2 class="sd-h2">7. Interview Q&amp;A</h2><div class="sd-block-body">
      <details class="sd-faq"><summary>Walk through what happens when you submit a task.</summary><div>Core thread if available → else enqueue → if queue full and below max, spawn non-core thread → else reject. Idle non-core threads expire after keepAlive.</div></details>
      <details class="sd-faq"><summary>Why avoid <code>Executors.newFixedThreadPool</code>?</summary><div>It uses an unbounded <code>LinkedBlockingQueue</code>; under load the queue grows until OutOfMemory. Configure a bounded queue + rejection policy explicitly.</div></details>
      <details class="sd-faq"><summary>How do you size a pool?</summary><div>CPU-bound ≈ cores+1; IO-bound ≈ cores×(1 + wait/compute). Measure, don't guess. Virtual threads change this for IO-bound work.</div></details>
      <details class="sd-faq"><summary>shutdown() vs shutdownNow()?</summary><div><code>shutdown()</code> stops accepting tasks but finishes queued ones; <code>shutdownNow()</code> attempts to interrupt running tasks and returns the unstarted queue.</div></details>
      <div class="sd-callout tip"><span class="sd-callout-l">Key takeaway</span>Bounded pool + bounded queue + sensible rejection policy + metrics. Never let the queue grow unbounded.</div>
    </div></section>
  `,

  "completablefuture": `
    <section class="sd-block" data-sec="overview"><h2 class="sd-h2">1. Overview</h2><div class="sd-block-body">
      <p><code>CompletableFuture&lt;T&gt;</code> (Java 8+) is a future you can <em>compose</em> — chain transformations, combine results, handle errors and run callbacks — without blocking. It's the backbone of non-blocking service orchestration (calling several downstreams in parallel and merging).</p>
    </div></section>
    <section class="sd-block" data-sec="theory"><h2 class="sd-h2">2. Core API</h2><div class="sd-block-body">
      <table><thead><tr><th>Method</th><th>Purpose</th></tr></thead><tbody>
        <tr><td><code>supplyAsync</code> / <code>runAsync</code></td><td>Start async work (with value / without)</td></tr>
        <tr><td><code>thenApply</code> / <code>thenApplyAsync</code></td><td>Transform the result (sync on completing thread / on a pool)</td></tr>
        <tr><td><code>thenCompose</code></td><td>Flat-map: chain another CF (avoids nested CF&lt;CF&gt;)</td></tr>
        <tr><td><code>thenCombine</code></td><td>Combine two independent CFs</td></tr>
        <tr><td><code>allOf</code> / <code>anyOf</code></td><td>Wait for all / first of many</td></tr>
        <tr><td><code>exceptionally</code> / <code>handle</code></td><td>Recover from / handle errors</td></tr>
        <tr><td><code>orTimeout</code> (Java 9+)</td><td>Fail if not done within a duration</td></tr>
      </tbody></table>
    </div></section>
    <section class="sd-block" data-sec="java"><h2 class="sd-h2">3. Complete Java — parallel fan-out + merge</h2><div class="sd-block-body">
      <pre><code class="language-java">import java.util.concurrent.*;

ExecutorService pool = Executors.newFixedThreadPool(8);

CompletableFuture&lt;Profile&gt; profile = CompletableFuture.supplyAsync(() -&gt; userClient.getProfile(id), pool);
CompletableFuture&lt;java.util.List&lt;Order&gt;&gt; orders = CompletableFuture.supplyAsync(() -&gt; orderClient.getOrders(id), pool);
CompletableFuture&lt;Integer&gt; points = CompletableFuture.supplyAsync(() -&gt; loyaltyClient.points(id), pool);

// combine three independent calls (they run in parallel)
CompletableFuture&lt;Dashboard&gt; dashboard = profile
    .thenCombine(orders, (p, o) -&gt; new Dashboard(p, o))
    .thenCombine(points, Dashboard::withPoints)
    .orTimeout(2, TimeUnit.SECONDS)                 // SLA guard
    .exceptionally(ex -&gt; Dashboard.fallback());      // graceful degradation

Dashboard result = dashboard.join();                // non-checked blocking get

// thenCompose example: dependent async calls (avoid CF&lt;CF&gt;)
CompletableFuture&lt;Address&gt; addr = userClient2(id)
    .thenCompose(user -&gt; addressClient(user.addressId()));   // flatMap</code></pre>
      <h4>allOf for a dynamic list</h4>
      <pre><code class="language-java">java.util.List&lt;CompletableFuture&lt;Item&gt;&gt; futures = ids.stream()
    .map(i -&gt; CompletableFuture.supplyAsync(() -&gt; fetch(i), pool))
    .toList();
CompletableFuture&lt;java.util.List&lt;Item&gt;&gt; all = CompletableFuture
    .allOf(futures.toArray(CompletableFuture[]::new))
    .thenApply(v -&gt; futures.stream().map(CompletableFuture::join).toList());</code></pre>
    </div></section>
    <section class="sd-block" data-sec="best"><h2 class="sd-h2">4. Best Practices & Common Mistakes</h2><div class="sd-block-body">
      <h4>Best practices</h4><ul><li><strong>Always pass an explicit executor</strong> to <code>*Async</code> methods — the default <code>ForkJoinPool.commonPool()</code> is shared and tiny; blocking IO on it starves everything.</li><li>Use <code>thenCompose</code> for dependent calls, <code>thenCombine</code>/<code>allOf</code> for independent ones.</li><li>Add <code>orTimeout</code> + <code>exceptionally</code>/<code>handle</code> for resilience.</li></ul>
      <h4>Common mistakes</h4><ul><li>Blocking inside <code>thenApply</code> on the common pool.</li><li>Swallowing exceptions — a CF that completes exceptionally is silent until you <code>join</code>/<code>handle</code>.</li><li>Using <code>thenApply</code> when you need <code>thenCompose</code> (ends up with <code>CompletableFuture&lt;CompletableFuture&lt;T&gt;&gt;</code>).</li></ul>
    </div></section>
    <section class="sd-block" data-sec="interview"><h2 class="sd-h2">5. Interview Q&amp;A</h2><div class="sd-block-body">
      <details class="sd-faq"><summary><code>thenApply</code> vs <code>thenCompose</code>?</summary><div><code>thenApply</code> maps <code>T → U</code> (sync transform). <code>thenCompose</code> maps <code>T → CompletableFuture&lt;U&gt;</code> and flattens — use it when the next step is itself async.</div></details>
      <details class="sd-faq"><summary><code>Future</code> vs <code>CompletableFuture</code>?</summary><div><code>Future.get()</code> only blocks; you can't compose or attach callbacks. <code>CompletableFuture</code> is non-blocking and composable, and can be completed manually.</div></details>
      <details class="sd-faq"><summary>Why pass your own executor?</summary><div>The default common pool is sized to cores−1 and shared JVM-wide; running blocking IO there starves parallel streams and other CFs. A dedicated bounded pool isolates the workload.</div></details>
      <details class="sd-faq"><summary>How to call 5 services in parallel and merge?</summary><div>Launch 5 <code>supplyAsync</code> on a pool, then <code>allOf(...).thenApply(join all)</code>, with <code>orTimeout</code> + fallback.</div></details>
      <div class="sd-callout tip"><span class="sd-callout-l">Key takeaway</span>CompletableFuture = composable non-blocking orchestration. Always supply an executor; compose with thenCompose/thenCombine/allOf; guard with orTimeout/exceptionally.</div>
    </div></section>
  `,

  "volatile-keyword": `
    <section class="sd-block" data-sec="overview"><h2 class="sd-h2">1. Overview</h2><div class="sd-block-body">
      <p><code>volatile</code> guarantees <strong>visibility</strong> and <strong>ordering</strong> for a single variable across threads — but <em>not</em> atomicity for compound operations. A write to a volatile is immediately visible to other threads, and the JMM forbids reordering across it.</p>
    </div></section>
    <section class="sd-block" data-sec="internal"><h2 class="sd-h2">2. What it does (and doesn't)</h2><div class="sd-block-body">
      <ul>
        <li><strong>Visibility:</strong> reads/writes go to main memory, not a thread-local cache → no stale values.</li>
        <li><strong>Ordering (happens-before):</strong> a write to a volatile happens-before every later read; acts as a memory fence (prevents reordering of surrounding reads/writes).</li>
        <li><strong>NOT atomic:</strong> <code>volatile int x; x++;</code> is still a race (read-modify-write). Use <code>AtomicInteger</code> for that.</li>
      </ul>
      <div class="sd-callout info"><span class="sd-callout-l">Mental model</span>volatile = "always read the freshest value &amp; don't reorder around me". It does not make multi-step updates indivisible.</div>
    </div></section>
    <section class="sd-block" data-sec="java"><h2 class="sd-h2">3. Canonical uses</h2><div class="sd-block-body">
      <h4>Stop flag (the textbook visibility example)</h4>
      <pre><code class="language-java">class Worker implements Runnable {
    private volatile boolean running = true;   // without volatile, the loop may never see false
    public void stop() { running = false; }
    public void run() { while (running) { /* work */ } }
}</code></pre>
      <h4>Double-checked locking singleton (volatile is mandatory here)</h4>
      <pre><code class="language-java">class Config {
    private static volatile Config instance;   // volatile prevents seeing a partially-constructed object
    private Config() {}
    static Config get() {
        if (instance == null) {
            synchronized (Config.class) {
                if (instance == null) instance = new Config();
            }
        }
        return instance;
    }
}</code></pre>
      <div class="sd-callout warn"><span class="sd-callout-l">Why volatile in DCL?</span><code>instance = new Config()</code> is allocate → construct → assign. Without volatile, the assignment can be reordered before construction finishes, so another thread sees a non-null but half-built object.</div>
    </div></section>
    <section class="sd-block" data-sec="compare"><h2 class="sd-h2">4. volatile vs synchronized</h2><div class="sd-block-body">
      <table><thead><tr><th></th><th>volatile</th><th>synchronized</th></tr></thead><tbody>
        <tr><td>Visibility</td><td>Yes</td><td>Yes</td></tr>
        <tr><td>Atomicity (compound)</td><td>No</td><td>Yes</td></tr>
        <tr><td>Mutual exclusion</td><td>No</td><td>Yes</td></tr>
        <tr><td>Blocking</td><td>Never</td><td>Can block</td></tr>
        <tr><td>Use for</td><td>Flags, single-writer publish, DCL</td><td>Critical sections, invariants over multiple fields</td></tr>
      </tbody></table>
    </div></section>
    <section class="sd-block" data-sec="interview"><h2 class="sd-h2">5. Interview Q&amp;A</h2><div class="sd-block-body">
      <details class="sd-faq"><summary>Does volatile make <code>i++</code> thread-safe?</summary><div>No. <code>i++</code> is read-modify-write (three steps). volatile only guarantees each individual read/write is fresh, not that the trio is indivisible. Use <code>AtomicInteger.incrementAndGet()</code>.</div></details>
      <details class="sd-faq"><summary>When is volatile enough (vs a lock)?</summary><div>When exactly one thread writes and others only read, or for a simple flag/reference publish, and you don't need an invariant across multiple variables.</div></details>
      <details class="sd-faq"><summary>Why is volatile required in double-checked locking?</summary><div>To prevent reordering that publishes a reference to a not-yet-constructed object, and to ensure the constructed fields are visible to the reader.</div></details>
      <div class="sd-callout tip"><span class="sd-callout-l">Key takeaway</span>volatile = visibility + ordering for one variable, no atomicity. Flags &amp; DCL → volatile; compound updates → atomics or locks.</div>
    </div></section>
  `,

  "volatile-atomic-transient": `
    <section class="sd-block" data-sec="overview"><h2 class="sd-h2">1. Overview</h2><div class="sd-block-body">
      <p>Three keywords frequently confused because they look similar but solve <strong>completely different</strong> problems: <code>volatile</code> (thread visibility), <code>Atomic*</code> classes (lock-free atomic updates), and <code>transient</code> (exclude a field from serialization). Knowing the distinction is a common interview filter.</p>
    </div></section>
    <section class="sd-block" data-sec="compare"><h2 class="sd-h2">2. The Big Comparison</h2><div class="sd-block-body">
      <table><thead><tr><th></th><th>volatile</th><th>Atomic (e.g. AtomicInteger)</th><th>transient</th></tr></thead><tbody>
        <tr><td>Problem solved</td><td>Visibility/ordering of one var</td><td>Atomic read-modify-write</td><td>Serialization exclusion</td></tr>
        <tr><td>Concurrency-related?</td><td>Yes</td><td>Yes</td><td>No</td></tr>
        <tr><td>Atomic compound ops?</td><td>No</td><td>Yes (CAS)</td><td>N/A</td></tr>
        <tr><td>Mechanism</td><td>Memory fence</td><td>CAS (Unsafe/VarHandle)</td><td>Skipped by <code>ObjectOutputStream</code></td></tr>
        <tr><td>Use case</td><td>stop flag, DCL</td><td>counters, sequence, lock-free stacks</td><td>passwords, caches, derived fields</td></tr>
      </tbody></table>
    </div></section>
    <section class="sd-block" data-sec="java"><h2 class="sd-h2">3. Code — each in its lane</h2><div class="sd-block-body">
      <h4>Atomic — lock-free counter via CAS</h4>
      <pre><code class="language-java">import java.util.concurrent.atomic.*;
AtomicInteger counter = new AtomicInteger(0);
counter.incrementAndGet();                 // atomic ++
counter.updateAndGet(x -&gt; x * 2);          // atomic transform
counter.compareAndSet(10, 20);            // CAS: set to 20 only if currently 10

AtomicReference&lt;Node&gt; head = new AtomicReference&lt;&gt;();
// lock-free push (Treiber stack)
Node n = new Node(v);
Node old;
do { old = head.get(); n.next = old; } while (!head.compareAndSet(old, n));

// High contention? LongAdder beats AtomicLong (striped cells, less CAS contention)
LongAdder hits = new LongAdder();
hits.increment();  long total = hits.sum();</code></pre>
      <h4>transient — exclude from serialization</h4>
      <pre><code class="language-java">class Session implements java.io.Serializable {
    private String userId;
    private transient String passwordHash;   // never serialized (security)
    private transient java.util.Map&lt;String,Object&gt; cache = new java.util.HashMap&lt;&gt;(); // derived, rebuildable
}
// On deserialization, transient fields are null/default — rebuild in readObject if needed.</code></pre>
    </div></section>
    <section class="sd-block" data-sec="internal"><h2 class="sd-h2">4. How CAS works (Compare-And-Swap)</h2><div class="sd-block-body">
      <p>CAS is a CPU instruction (<code>CMPXCHG</code>): "atomically, if memory at address == expected, set it to newValue; return whether it succeeded." Atomic classes loop on CAS until success — no OS lock, no blocking. This is <strong>optimistic</strong> concurrency: cheap under low contention, but can spin under high contention (hence <code>LongAdder</code>).</p>
      <pre class="mermaid">graph LR
  R[read current] --> C{CAS expected==current?}
  C -- yes --> D[write new, done]
  C -- no --> R</pre>
    </div></section>
    <section class="sd-block" data-sec="interview"><h2 class="sd-h2">5. Interview Q&amp;A</h2><div class="sd-block-body">
      <details class="sd-faq"><summary>volatile vs AtomicInteger for a counter?</summary><div>volatile gives visibility but <code>x++</code> is still a race. AtomicInteger gives atomic increment via CAS. Use Atomic for counters.</div></details>
      <details class="sd-faq"><summary>AtomicLong vs LongAdder?</summary><div>Under high write contention, AtomicLong threads all CAS the same cell and spin. LongAdder spreads writes across striped cells and sums on read — far higher throughput for hot counters (metrics).</div></details>
      <details class="sd-faq"><summary>What does transient have to do with threads?</summary><div>Nothing — it's about serialization. It's a trick question; mixing it with volatile/atomic tests whether you actually understand each.</div></details>
      <details class="sd-faq"><summary>What is the ABA problem?</summary><div>A value changes A→B→A; a plain CAS thinks nothing changed. Fix with <code>AtomicStampedReference</code> (version stamp).</div></details>
      <div class="sd-callout tip"><span class="sd-callout-l">Key takeaway</span>volatile = visibility, Atomic = atomic CAS updates, transient = serialization exclusion. Different problems entirely.</div>
    </div></section>
  `,

  "synchronized-vs-reentrantlock": `
    <section class="sd-block" data-sec="overview"><h2 class="sd-h2">1. Overview</h2><div class="sd-block-body">
      <p>Both provide mutual exclusion. <code>synchronized</code> is a JVM intrinsic (simple, automatic release); <code>ReentrantLock</code> (<code>java.util.concurrent.locks</code>) is a flexible explicit lock with timeouts, interruptibility, fairness and condition variables. Choose based on what features you need.</p>
    </div></section>
    <section class="sd-block" data-sec="compare"><h2 class="sd-h2">2. Comparison</h2><div class="sd-block-body">
      <table><thead><tr><th>Feature</th><th>synchronized</th><th>ReentrantLock</th></tr></thead><tbody>
        <tr><td>Acquire/release</td><td>Implicit (block scope), auto-released</td><td>Explicit <code>lock()</code>/<code>unlock()</code> (must use finally)</td></tr>
        <tr><td>Try with timeout</td><td>No</td><td><code>tryLock(time, unit)</code></td></tr>
        <tr><td>Interruptible wait</td><td>No</td><td><code>lockInterruptibly()</code></td></tr>
        <tr><td>Fairness</td><td>No (unfair)</td><td>Optional fair mode</td></tr>
        <tr><td>Condition variables</td><td>One wait-set (<code>wait/notify</code>)</td><td>Multiple <code>Condition</code> objects</td></tr>
        <tr><td>Reentrant</td><td>Yes</td><td>Yes</td></tr>
        <tr><td>Performance</td><td>Excellent (JVM-optimized: biased/lightweight locks)</td><td>Comparable; better under heavy contention/features</td></tr>
      </tbody></table>
    </div></section>
    <section class="sd-block" data-sec="java"><h2 class="sd-h2">3. Code</h2><div class="sd-block-body">
      <h4>synchronized</h4>
      <pre><code class="language-java">class Account {
    private double balance;
    public synchronized void deposit(double amt){ balance += amt; } // locks 'this'
    public void withdraw(double amt){
        synchronized (this) { if (balance &gt;= amt) balance -= amt; } // block form
    }
}</code></pre>
      <h4>ReentrantLock with tryLock (avoid deadlock) &amp; Condition</h4>
      <pre><code class="language-java">import java.util.concurrent.locks.*;
class BoundedBuffer&lt;T&gt; {
    private final ReentrantLock lock = new ReentrantLock();
    private final Condition notFull  = lock.newCondition();
    private final Condition notEmpty = lock.newCondition();
    private final java.util.Deque&lt;T&gt; q = new java.util.ArrayDeque&lt;&gt;();
    private final int cap;
    BoundedBuffer(int cap){ this.cap = cap; }

    public void put(T item) throws InterruptedException {
        lock.lock();
        try {
            while (q.size() == cap) notFull.await();   // wait on a specific condition
            q.add(item); notEmpty.signal();
        } finally { lock.unlock(); }                    // ALWAYS release in finally
    }
    public T take() throws InterruptedException {
        lock.lock();
        try {
            while (q.isEmpty()) notEmpty.await();
            T v = q.poll(); notFull.signal(); return v;
        } finally { lock.unlock(); }
    }
}

// tryLock to avoid deadlock when acquiring two locks
boolean tryTransfer(Account a, Account b, Lock la, Lock lb){
    if (la.tryLock()) {
        try { if (lb.tryLock()) { try { /* transfer */ return true; } finally { lb.unlock(); } } }
        finally { la.unlock(); }
    }
    return false; // back off and retry — no deadlock
}</code></pre>
    </div></section>
    <section class="sd-block" data-sec="best"><h2 class="sd-h2">4. Best Practices & Common Mistakes</h2><div class="sd-block-body">
      <h4>Best practices</h4><ul><li>Prefer <code>synchronized</code> for simple cases (auto-release, less error-prone). Reach for <code>ReentrantLock</code> when you need timeout/interruptibility/fairness/multiple conditions.</li><li>Always <code>unlock()</code> in a <code>finally</code>.</li><li>Use <code>ReadWriteLock</code>/<code>StampedLock</code> for read-heavy data.</li></ul>
      <h4>Common mistakes</h4><ul><li>Forgetting <code>unlock()</code> → permanent lock (deadlock).</li><li>Locking on a mutable/shared/interned object (<code>String</code>, <code>Integer</code>) — lock on a private <code>final Object</code>.</li><li>Using <code>if</code> instead of <code>while</code> around <code>await()</code> (spurious wakeups).</li></ul>
    </div></section>
    <section class="sd-block" data-sec="interview"><h2 class="sd-h2">5. Interview Q&amp;A</h2><div class="sd-block-body">
      <details class="sd-faq"><summary>When would you choose ReentrantLock?</summary><div>When you need <code>tryLock</code> with timeout (deadlock avoidance), interruptible acquisition, fairness, or multiple condition queues — none of which <code>synchronized</code> offers.</div></details>
      <details class="sd-faq"><summary>What does "reentrant" mean?</summary><div>The same thread can re-acquire a lock it already holds (a hold count) without deadlocking itself — e.g. a synchronized method calling another synchronized method on the same object.</div></details>
      <details class="sd-faq"><summary>wait/notify vs Condition?</summary><div><code>synchronized</code> has a single wait-set, so <code>notifyAll</code> wakes everyone. <code>ReentrantLock</code> can have several <code>Condition</code>s (e.g. notFull/notEmpty), waking only the relevant waiters — more efficient and clearer.</div></details>
      <details class="sd-faq"><summary>Is synchronized slow?</summary><div>Not anymore — the JVM uses biased/lightweight locking and only inflates to a heavyweight monitor under real contention. For uncontended locks it's nearly free.</div></details>
      <div class="sd-callout tip"><span class="sd-callout-l">Key takeaway</span>synchronized for simple auto-released mutual exclusion; ReentrantLock for tryLock/interrupt/fairness/multiple conditions — always unlock in finally.</div>
    </div></section>
  `,

  "synchronization-types": `
    <section class="sd-block" data-sec="overview"><h2 class="sd-h2">1. Overview</h2><div class="sd-block-body">
      <p>Java offers a spectrum of synchronization mechanisms beyond <code>synchronized</code>. Knowing which tool fits which coordination problem (mutual exclusion, read/write, counting permits, rendezvous, one-time latch) is a senior-level differentiator.</p>
    </div></section>
    <section class="sd-block" data-sec="catalog"><h2 class="sd-h2">2. The Toolkit</h2><div class="sd-block-body">
      <table><thead><tr><th>Tool</th><th>Use when…</th></tr></thead><tbody>
        <tr><td><code>synchronized</code> / <code>ReentrantLock</code></td><td>Mutual exclusion of a critical section</td></tr>
        <tr><td><code>ReadWriteLock</code> / <code>StampedLock</code></td><td>Many readers, few writers (read-heavy cache)</td></tr>
        <tr><td><code>Semaphore</code></td><td>Limit concurrent access to N permits (connection/rate limit)</td></tr>
        <tr><td><code>CountDownLatch</code></td><td>Wait for N one-time events to complete (startup gate)</td></tr>
        <tr><td><code>CyclicBarrier</code></td><td>N threads rendezvous repeatedly (parallel phases)</td></tr>
        <tr><td><code>Phaser</code></td><td>Flexible multi-phase barrier with dynamic parties</td></tr>
        <tr><td><code>Exchanger</code></td><td>Two threads swap objects at a sync point</td></tr>
        <tr><td>Atomics / <code>volatile</code></td><td>Lock-free single-variable updates / visibility</td></tr>
      </tbody></table>
    </div></section>
    <section class="sd-block" data-sec="java"><h2 class="sd-h2">3. Code — the high-value ones</h2><div class="sd-block-body">
      <h4>Semaphore — bound concurrency to N</h4>
      <pre><code class="language-java">java.util.concurrent.Semaphore permits = new java.util.concurrent.Semaphore(10); // max 10 in-flight
void callDownstream() throws InterruptedException {
    permits.acquire();
    try { http.call(); } finally { permits.release(); }   // bulkhead / concurrency limit
}</code></pre>
      <h4>CountDownLatch — wait for all workers</h4>
      <pre><code class="language-java">var latch = new java.util.concurrent.CountDownLatch(3);
for (int i = 0; i &lt; 3; i++) pool.submit(() -&gt; { try { work(); } finally { latch.countDown(); } });
latch.await();   // blocks until all 3 finished — one-time use</code></pre>
      <h4>ReadWriteLock — read-heavy map</h4>
      <pre><code class="language-java">var rw = new java.util.concurrent.locks.ReentrantReadWriteLock();
java.util.Map&lt;String,String&gt; data = new java.util.HashMap&lt;&gt;();
String read(String k){ rw.readLock().lock(); try { return data.get(k); } finally { rw.readLock().unlock(); } }
void write(String k,String v){ rw.writeLock().lock(); try { data.put(k,v); } finally { rw.writeLock().unlock(); } }</code></pre>
    </div></section>
    <section class="sd-block" data-sec="interview"><h2 class="sd-h2">4. Interview Q&amp;A</h2><div class="sd-block-body">
      <details class="sd-faq"><summary>CountDownLatch vs CyclicBarrier?</summary><div>Latch is one-shot — counts down to zero and stays there (wait for events). Barrier is reusable — N threads wait for each other, then all proceed, and it resets for the next phase.</div></details>
      <details class="sd-faq"><summary>When Semaphore over a lock?</summary><div>When you allow up to N concurrent holders (e.g. cap 10 simultaneous DB/API calls — a bulkhead), not strictly one. A binary semaphore (1 permit) ≈ a non-reentrant lock.</div></details>
      <details class="sd-faq"><summary>ReadWriteLock pitfalls?</summary><div>Writer starvation under constant reads; no lock upgrade (read→write) without releasing. <code>StampedLock</code> offers optimistic reads but isn't reentrant.</div></details>
      <div class="sd-callout tip"><span class="sd-callout-l">Key takeaway</span>Pick the smallest tool that fits: Semaphore (N permits), Latch (one-shot wait), Barrier (reusable rendezvous), ReadWriteLock (read-heavy).</div>
    </div></section>
  `,

  "blockingqueue": `
    <section class="sd-block" data-sec="overview"><h2 class="sd-h2">1. Overview</h2><div class="sd-block-body">
      <p><code>BlockingQueue&lt;T&gt;</code> is a thread-safe queue where <code>take()</code> blocks when empty and <code>put()</code> blocks when full. It's the backbone of the <strong>producer–consumer</strong> pattern and the work queue inside every <code>ThreadPoolExecutor</code>.</p>
    </div></section>
    <section class="sd-block" data-sec="impls"><h2 class="sd-h2">2. Implementations</h2><div class="sd-block-body">
      <table><thead><tr><th>Implementation</th><th>Bounded?</th><th>Notes</th></tr></thead><tbody>
        <tr><td><code>ArrayBlockingQueue</code></td><td>Yes (fixed)</td><td>Single lock; predictable memory; good default for back-pressure</td></tr>
        <tr><td><code>LinkedBlockingQueue</code></td><td>Optional (default ∞)</td><td>Two locks (higher throughput); unbounded by default → OOM risk</td></tr>
        <tr><td><code>PriorityBlockingQueue</code></td><td>No</td><td>Ordered by priority; unbounded</td></tr>
        <tr><td><code>SynchronousQueue</code></td><td>0 capacity</td><td>Direct hand-off; used by <code>newCachedThreadPool</code></td></tr>
        <tr><td><code>DelayQueue</code></td><td>No</td><td>Elements available only after a delay (schedulers)</td></tr>
      </tbody></table>
    </div></section>
    <section class="sd-block" data-sec="java"><h2 class="sd-h2">3. Complete Java — producer/consumer</h2><div class="sd-block-body">
      <pre><code class="language-java">import java.util.concurrent.*;

BlockingQueue&lt;Task&gt; queue = new ArrayBlockingQueue&lt;&gt;(1000);  // bounded → back-pressure

// Producer
Runnable producer = () -&gt; {
    try { while (true) queue.put(produce()); }              // blocks if full
    catch (InterruptedException e) { Thread.currentThread().interrupt(); }
};
// Consumer
Runnable consumer = () -&gt; {
    try { while (true) { Task t = queue.take(); handle(t); } } // blocks if empty
    catch (InterruptedException e) { Thread.currentThread().interrupt(); }
};

// Graceful with a poison pill or timed offer/poll:
boolean accepted = queue.offer(task, 200, TimeUnit.MILLISECONDS); // false if still full → shed load
Task t = queue.poll(1, TimeUnit.SECONDS);                          // null if nothing within 1s</code></pre>
      <div class="sd-callout warn"><span class="sd-callout-l">Method families</span><code>put/take</code> block · <code>offer/poll</code> (timed) return false/null · <code>add/remove</code> throw. Pick by your overflow policy.</div>
    </div></section>
    <section class="sd-block" data-sec="interview"><h2 class="sd-h2">4. Interview Q&amp;A</h2><div class="sd-block-body">
      <details class="sd-faq"><summary>How does it implement producer–consumer without busy-waiting?</summary><div>Internally a lock + two conditions (notFull/notEmpty). <code>put</code> awaits notFull, <code>take</code> awaits notEmpty; each signals the other. Threads sleep instead of spinning.</div></details>
      <details class="sd-faq"><summary>ArrayBlockingQueue vs LinkedBlockingQueue?</summary><div>Array is fixed-capacity with one lock (lower memory, predictable). Linked uses separate put/take locks (higher throughput) but is unbounded by default — set a capacity to avoid OOM.</div></details>
      <details class="sd-faq"><summary>Why does a bounded queue matter for a thread pool?</summary><div>It provides back-pressure: when full, the rejection policy kicks in (e.g. CallerRuns) instead of memory growing unbounded.</div></details>
      <details class="sd-faq"><summary>What is SynchronousQueue?</summary><div>A zero-capacity queue — each put must wait for a matching take (direct hand-off). Used by cached thread pools to hand tasks straight to a free/new thread.</div></details>
      <div class="sd-callout tip"><span class="sd-callout-l">Key takeaway</span>BlockingQueue = thread-safe producer/consumer buffer. Use bounded queues for back-pressure; choose method family (put/offer/add) by overflow policy.</div>
    </div></section>
  `,

  "concurrenthashmap": `
    <section class="sd-block" data-sec="overview"><h2 class="sd-h2">1. Overview</h2><div class="sd-block-body">
      <p><code>ConcurrentHashMap</code> (CHM) is a thread-safe <code>HashMap</code> with near-lock-free reads and fine-grained locking on writes — vastly more scalable than <code>Collections.synchronizedMap</code> or <code>Hashtable</code> (which lock the whole map). It's the default concurrent map for caches, counters and shared registries.</p>
    </div></section>
    <section class="sd-block" data-sec="internal"><h2 class="sd-h2">2. Internal Working (Java 8+)</h2><div class="sd-block-body">
      <ul>
        <li><strong>Reads are lock-free:</strong> nodes' <code>val</code> and <code>next</code> are <code>volatile</code>; <code>get()</code> never locks.</li>
        <li><strong>Writes lock one bin:</strong> on a collision, the write <code>synchronized</code>-locks just the <em>first node of that bucket</em> (not the whole map). Different buckets proceed in parallel.</li>
        <li><strong>Empty bucket insert</strong> uses a CAS (no lock at all).</li>
        <li><strong>Treeification:</strong> a bucket with &gt; 8 entries (and table ≥ 64) converts its linked list to a red-black tree → O(log n) worst case instead of O(n).</li>
        <li><strong>Resize</strong> is cooperative — multiple threads help transfer bins concurrently.</li>
        <li>Pre-Java 8 used 16 lock "segments"; Java 8 replaced that with per-bin locking + CAS.</li>
      </ul>
      <pre class="mermaid">graph TD
  P[put key] --> H[hash to bucket]
  H --> E{bucket empty?}
  E -- yes --> CAS[CAS new node - lock-free]
  E -- no --> L[synchronized on first node]
  L --> T{size&gt;8 &amp; cap&gt;=64?}
  T -- yes --> TR[treeify bucket]
  T -- no --> AP[append/update in list]</pre>
    </div></section>
    <section class="sd-block" data-sec="java"><h2 class="sd-h2">3. Code — atomic compound ops</h2><div class="sd-block-body">
      <pre><code class="language-java">import java.util.concurrent.ConcurrentHashMap;
ConcurrentHashMap&lt;String,Integer&gt; counts = new ConcurrentHashMap&lt;&gt;();

// WRONG: get-then-put is a race (two steps)
// if (!counts.containsKey(k)) counts.put(k, 0);  counts.put(k, counts.get(k)+1);

// RIGHT: atomic merge / compute
counts.merge(k, 1, Integer::sum);                 // atomic increment
counts.computeIfAbsent(k, x -&gt; expensiveInit());  // atomic lazy init (runs once per key)
counts.compute(k, (key,v) -&gt; v == null ? 1 : v+1);

// Bulk parallel ops
counts.forEach(4, (key,v) -&gt; { if (v &gt; 100) log(key); });   // parallelismThreshold
Integer total = counts.reduceValues(4, Integer::sum);</code></pre>
      <div class="sd-callout warn"><span class="sd-callout-l">Trap</span>CHM makes <em>each</em> operation atomic, but a sequence of operations (<code>containsKey</code> then <code>put</code>) is still a race. Use <code>merge</code>/<code>compute</code>/<code>putIfAbsent</code> for compound updates.</div>
    </div></section>
    <section class="sd-block" data-sec="rules"><h2 class="sd-h2">4. Rules & Gotchas</h2><div class="sd-block-body">
      <ul><li><strong>No null keys/values</strong> (ambiguity with "absent" in concurrent context).</li><li>Iterators are <strong>weakly consistent</strong> — never throw <code>ConcurrentModificationException</code>; they reflect some state during iteration, not a snapshot.</li><li><code>size()</code> is an estimate under concurrency.</li><li>Keep functions passed to <code>compute*</code> short and side-effect-free (they run while holding the bin lock).</li></ul>
    </div></section>
    <section class="sd-block" data-sec="interview"><h2 class="sd-h2">5. Interview Q&amp;A</h2><div class="sd-block-body">
      <details class="sd-faq"><summary>How is CHM better than Hashtable / synchronizedMap?</summary><div>Those lock the entire map for every operation (one global lock). CHM locks only one bucket on write and never locks on read → far higher concurrency.</div></details>
      <details class="sd-faq"><summary>How does it lock in Java 8?</summary><div>Per-bin: CAS to insert into an empty bucket; <code>synchronized</code> on the bin's first node for collisions. Buckets are independent, so writers to different buckets don't contend.</div></details>
      <details class="sd-faq"><summary>Why no null keys/values?</summary><div><code>get()</code> returning null would be ambiguous ("absent" vs "present with null") and can't be disambiguated atomically without a second locked call.</div></details>
      <details class="sd-faq"><summary>Is <code>map.get(k); map.put(k,...)</code> thread-safe?</summary><div>Each call is, but the pair isn't atomic. Use <code>compute</code>/<code>merge</code>.</div></details>
      <div class="sd-callout tip"><span class="sd-callout-l">Key takeaway</span>Lock-free reads + per-bucket write locks + CAS + treeified bins. Use atomic <code>merge/compute/computeIfAbsent</code> for compound updates; no nulls.</div>
    </div></section>
  `,

  "hashmap-vs-chm-internal": `
    <section class="sd-block" data-sec="overview"><h2 class="sd-h2">1. Overview</h2><div class="sd-block-body">
      <p>A deep dive into how <code>HashMap</code> works internally and exactly where <code>ConcurrentHashMap</code> diverges. This is one of the most-asked Java internals questions.</p>
    </div></section>
    <section class="sd-block" data-sec="hashmap"><h2 class="sd-h2">2. HashMap Internals</h2><div class="sd-block-body">
      <ul>
        <li><strong>Backing array</strong> of <code>Node[]</code> ("buckets"), default capacity 16, load factor 0.75.</li>
        <li><strong>Index:</strong> <code>(n - 1) &amp; hash</code> where <code>hash = h ^ (h &gt;&gt;&gt; 16)</code> (spreads high bits to reduce collisions).</li>
        <li><strong>Collisions:</strong> chained in a linked list; since Java 8, a bucket with ≥ 8 nodes (table ≥ 64) becomes a <strong>red-black tree</strong> → O(log n) lookup; reverts to list below 6.</li>
        <li><strong>Resize:</strong> when <code>size &gt; capacity × loadFactor</code>, capacity doubles and entries rehash (split into "lo"/"hi" bins).</li>
        <li><strong>Not thread-safe:</strong> concurrent writes can corrupt the structure (pre-Java 8 resize could even infinite-loop).</li>
      </ul>
      <pre class="mermaid">graph LR
  K[key] --> H[hash = h ^ h&gt;&gt;&gt;16] --> I["index = (n-1) &amp; hash"] --> B[bucket: list or tree]</pre>
    </div></section>
    <section class="sd-block" data-sec="compare"><h2 class="sd-h2">3. HashMap vs ConcurrentHashMap</h2><div class="sd-block-body">
      <table><thead><tr><th>Aspect</th><th>HashMap</th><th>ConcurrentHashMap</th></tr></thead><tbody>
        <tr><td>Thread-safe</td><td>No</td><td>Yes</td></tr>
        <tr><td>Locking</td><td>None</td><td>Per-bucket (synchronized) + CAS</td></tr>
        <tr><td>Reads</td><td>—</td><td>Lock-free (volatile nodes)</td></tr>
        <tr><td>Null key/value</td><td>One null key, null values OK</td><td>Neither allowed</td></tr>
        <tr><td>Iterator</td><td>Fail-fast (CME)</td><td>Weakly consistent</td></tr>
        <tr><td>Performance (single thread)</td><td>Fastest</td><td>Slight overhead</td></tr>
        <tr><td>Performance (concurrent)</td><td>Unsafe</td><td>Scales with buckets</td></tr>
      </tbody></table>
    </div></section>
    <section class="sd-block" data-sec="interview"><h2 class="sd-h2">4. Interview Q&amp;A</h2><div class="sd-block-body">
      <details class="sd-faq"><summary>Why does HashMap convert lists to trees?</summary><div>To bound worst-case lookup. With many collisions (poor hashCode or attack), a list degrades to O(n); a red-black tree keeps it O(log n). Threshold 8 (treeify) / 6 (untreeify) avoids thrashing.</div></details>
      <details class="sd-faq"><summary>Why is capacity a power of two?</summary><div>So <code>index = (n-1) &amp; hash</code> is a cheap bitmask instead of a modulo, and resizing splits each bucket cleanly into two.</div></details>
      <details class="sd-faq"><summary>What breaks if two threads <code>put</code> to a plain HashMap?</summary><div>Lost updates, corrupted chains, and (Java 7) a resize race could form a cycle causing 100% CPU infinite loop on <code>get</code>. Use CHM.</div></details>
      <details class="sd-faq"><summary>What makes a good hashCode/equals?</summary><div>Consistent with equals, well-distributed, stable for the key's lifetime. Mutating a key's hashCode after insertion makes it unfindable.</div></details>
      <div class="sd-callout tip"><span class="sd-callout-l">Key takeaway</span>HashMap: power-of-two buckets, bit-spread hash, list→tree at 8. CHM adds lock-free reads + per-bucket write locks; no nulls; weakly-consistent iterators.</div>
    </div></section>
  `,

  "deadlock-livelock-starvation": `
    <section class="sd-block" data-sec="overview"><h2 class="sd-h2">1. Overview</h2><div class="sd-block-body">
      <p>Three classic <strong>liveness failures</strong>: <strong>deadlock</strong> (threads block forever waiting on each other), <strong>livelock</strong> (threads keep reacting but make no progress), and <strong>starvation</strong> (a thread never gets CPU/locks). Diagnosing and preventing them is core senior knowledge.</p>
    </div></section>
    <section class="sd-block" data-sec="deadlock"><h2 class="sd-h2">2. Deadlock — Coffman conditions</h2><div class="sd-block-body">
      <p>Deadlock needs all four simultaneously: <strong>mutual exclusion</strong>, <strong>hold-and-wait</strong>, <strong>no preemption</strong>, <strong>circular wait</strong>. Break any one to prevent it.</p>
      <pre class="mermaid">graph LR
  T1[Thread 1 holds A] -->|wants B| T2[Thread 2 holds B]
  T2 -->|wants A| T1</pre>
      <h4>Classic deadlock + the fix</h4>
      <pre><code class="language-java">// DEADLOCK: thread 1 locks A then B; thread 2 locks B then A
void transfer(Account from, Account to, double amt){
    synchronized (from) {
        synchronized (to) { from.debit(amt); to.credit(amt); }
    }
}
// FIX 1 — global lock ordering (break circular wait): always lock lower id first
void safeTransfer(Account from, Account to, double amt){
    Account first  = from.id() &lt; to.id() ? from : to;
    Account second = from.id() &lt; to.id() ? to : from;
    synchronized (first) { synchronized (second) { from.debit(amt); to.credit(amt); } }
}
// FIX 2 — tryLock with timeout (break hold-and-wait): back off &amp; retry
</code></pre>
    </div></section>
    <section class="sd-block" data-sec="others"><h2 class="sd-h2">3. Livelock & Starvation</h2><div class="sd-block-body">
      <ul>
        <li><strong>Livelock:</strong> threads keep changing state in response to each other but never progress (two people stepping aside in a corridor in sync). Fix: randomized backoff.</li>
        <li><strong>Starvation:</strong> a thread is perpetually denied resources — e.g. low-priority thread never scheduled, or writer starved by constant readers. Fix: fair locks, bounded priorities, aging.</li>
      </ul>
    </div></section>
    <section class="sd-block" data-sec="debug"><h2 class="sd-h2">4. Detection & Debugging (production)</h2><div class="sd-block-body">
      <ul>
        <li><strong>Thread dump:</strong> <code>jstack &lt;pid&gt;</code> (or <code>kill -3</code>) — the JVM prints "Found one Java-level deadlock" with the cycle.</li>
        <li><code>jcmd &lt;pid&gt; Thread.print</code>; visualize in VisualVM / JMC.</li>
        <li><code>ThreadMXBean.findDeadlockedThreads()</code> programmatically (alert/auto-dump).</li>
        <li>Symptoms: requests hang, thread pool exhausted, CPU near 0 (deadlock) or near 100% (livelock/spin).</li>
      </ul>
      <pre><code class="language-java">var bean = java.lang.management.ManagementFactory.getThreadMXBean();
long[] deadlocked = bean.findDeadlockedThreads();
if (deadlocked != null) { /* log thread info, alert, maybe self-heal */ }</code></pre>
    </div></section>
    <section class="sd-block" data-sec="interview"><h2 class="sd-h2">5. Interview Q&amp;A</h2><div class="sd-block-body">
      <details class="sd-faq"><summary>Name the four conditions for deadlock and how to break one.</summary><div>Mutual exclusion, hold-and-wait, no preemption, circular wait. Most practical fix: impose a <strong>global lock ordering</strong> (breaks circular wait) or use <code>tryLock</code> with timeout (breaks hold-and-wait).</div></details>
      <details class="sd-faq"><summary>Deadlock vs livelock?</summary><div>Deadlock: threads are blocked, doing nothing (CPU ~0). Livelock: threads are active and keep retrying/yielding but make no progress (CPU busy). Livelock fix is randomized backoff.</div></details>
      <details class="sd-faq"><summary>How do you find a deadlock in prod?</summary><div>Take a thread dump (<code>jstack</code>/<code>jcmd</code>); the JVM explicitly reports the deadlock cycle and the monitors involved. Or poll <code>ThreadMXBean.findDeadlockedThreads()</code>.</div></details>
      <details class="sd-faq"><summary>How to avoid writer starvation in ReadWriteLock?</summary><div>Use a fair lock, or <code>StampedLock</code>, or cap reader concurrency so writers get a turn.</div></details>
      <div class="sd-callout tip"><span class="sd-callout-l">Key takeaway</span>Prevent deadlock by lock-ordering or tryLock-timeout; detect with thread dumps. Livelock → backoff; starvation → fairness.</div>
    </div></section>
  `,

  "jvm-gc-overview": `
    <section class="sd-block" data-sec="overview"><h2 class="sd-h2">1. Overview</h2><div class="sd-block-body">
      <p>The <strong>JVM</strong> loads bytecode, JIT-compiles hot methods to native code, and automatically reclaims unused objects via <strong>Garbage Collection</strong>. Understanding the memory layout and GC algorithms is essential for diagnosing latency spikes, OOMs and memory leaks in production services.</p>
    </div></section>
    <section class="sd-block" data-sec="memory"><h2 class="sd-h2">2. JVM Memory Areas</h2><div class="sd-block-body">
      <ul>
        <li><strong>Heap</strong> (shared): all objects. Split into <em>Young</em> (Eden + 2 Survivor spaces) and <em>Old/Tenured</em>.</li>
        <li><strong>Metaspace</strong> (off-heap): class metadata (replaced PermGen in Java 8).</li>
        <li><strong>Stack</strong> (per thread): frames, local primitives, references.</li>
        <li><strong>PC register</strong> &amp; <strong>native method stack</strong> (per thread).</li>
      </ul>
      <pre class="mermaid">graph TD
  H[Heap] --> Y[Young Gen]
  H --> O[Old Gen]
  Y --> E[Eden]
  Y --> S0[Survivor 0]
  Y --> S1[Survivor 1]</pre>
    </div></section>
    <section class="sd-block" data-sec="gc"><h2 class="sd-h2">3. GC — Generational Hypothesis & Algorithms</h2><div class="sd-block-body">
      <p><strong>Weak generational hypothesis:</strong> most objects die young. So GC scans the small Young gen frequently (cheap <em>minor GC</em>, copying survivors), and the Old gen rarely (expensive <em>major/full GC</em>). Surviving several minor GCs → promoted to Old.</p>
      <table><thead><tr><th>Collector</th><th>Best for</th><th>Notes</th></tr></thead><tbody>
        <tr><td><strong>G1</strong> (default 9+)</td><td>Balanced latency/throughput</td><td>Region-based, predictable pause targets</td></tr>
        <tr><td><strong>ZGC</strong></td><td>Very low pause (&lt; 1 ms), huge heaps</td><td>Concurrent, scalable to TBs</td></tr>
        <tr><td><strong>Shenandoah</strong></td><td>Low pause</td><td>Concurrent compaction</td></tr>
        <tr><td>Parallel</td><td>Batch / throughput</td><td>Stop-the-world, high throughput</td></tr>
        <tr><td>Serial</td><td>Tiny heaps / single core</td><td>Simple</td></tr>
      </tbody></table>
    </div></section>
    <section class="sd-block" data-sec="tuning"><h2 class="sd-h2">4. Tuning, OOM & Leaks</h2><div class="sd-block-body">
      <pre><code class="language-bash"># Common flags
-Xms2g -Xmx2g                       # set min=max heap to avoid resize pauses
-XX:+UseZGC                         # low-latency collector
-XX:MaxGCPauseMillis=200            # G1 pause target
-XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=/var/log/heapdump.hprof
-Xlog:gc*:file=gc.log:time,uptime   # GC logging (Java 9+ unified logging)</code></pre>
      <ul>
        <li><strong>OutOfMemoryError: Java heap space</strong> → leak or under-sized heap. Capture a heap dump, analyze with Eclipse MAT (dominator tree → who retains memory).</li>
        <li><strong>Common leaks:</strong> unbounded caches/maps, <code>ThreadLocal</code> not removed (esp. in pooled threads), listeners never unregistered, static collections.</li>
        <li><strong>GC thrash:</strong> frequent full GCs with little reclaimed → heap too small or live-set too large.</li>
      </ul>
    </div></section>
    <section class="sd-block" data-sec="interview"><h2 class="sd-h2">5. Interview Q&amp;A</h2><div class="sd-block-body">
      <details class="sd-faq"><summary>Why generational GC?</summary><div>Most objects die young, so collecting the small Young gen often (and cheaply via copying) reclaims the bulk of garbage while rarely touching long-lived Old-gen objects.</div></details>
      <details class="sd-faq"><summary>Stack vs heap?</summary><div>Stack holds per-thread frames (locals, references) and is auto-freed on method return; heap holds objects shared across threads and is GC-managed.</div></details>
      <details class="sd-faq"><summary>How do you debug a memory leak?</summary><div>Enable <code>-XX:+HeapDumpOnOutOfMemoryError</code>, open the dump in MAT, inspect the dominator tree for unexpectedly large retained sets (often a static/unbounded cache or ThreadLocal).</div></details>
      <details class="sd-faq"><summary>G1 vs ZGC?</summary><div>G1 = balanced default with region-based collection and pause targets; ZGC = concurrent, sub-millisecond pauses for very large heaps and latency-critical services.</div></details>
      <div class="sd-callout tip"><span class="sd-callout-l">Key takeaway</span>Heap = Young (Eden+Survivors) + Old; minor GC is cheap, full GC is costly. Pick G1/ZGC by latency needs; debug leaks via heap dumps + MAT.</div>
    </div></section>
  `,

  "virtual-threads": `
    <section class="sd-block" data-sec="overview"><h2 class="sd-h2">1. Overview</h2><div class="sd-block-body">
      <p><strong>Virtual threads</strong> (Project Loom, GA in <strong>Java 21</strong>) are lightweight threads managed by the JVM, not the OS. You can run <em>millions</em> of them. They make the simple "thread-per-request" blocking style scale like async code — without the complexity of reactive programming.</p>
    </div></section>
    <section class="sd-block" data-sec="internal"><h2 class="sd-h2">2. Internal Working</h2><div class="sd-block-body">
      <ul>
        <li>A <strong>platform thread</strong> = an OS thread (~1 MB stack, limited to thousands).</li>
        <li>A <strong>virtual thread</strong> is a tiny heap object scheduled by the JVM onto a small pool of <em>carrier</em> platform threads (a ForkJoinPool).</li>
        <li>On a blocking call (IO, sleep, lock), the virtual thread <strong>unmounts</strong> from its carrier and parks; the carrier runs another virtual thread. When IO completes, it remounts. The blocking code <em>looks</em> synchronous but doesn't pin an OS thread.</li>
      </ul>
      <pre class="mermaid">graph TD
  VT1[VThread 1] -->|mounted| C1[Carrier OS thread]
  VT2[VThread 2] -.->|parked on IO| C1
  VT3[VThread 3] -->|mounted| C2[Carrier OS thread]</pre>
    </div></section>
    <section class="sd-block" data-sec="java"><h2 class="sd-h2">3. Code (Java 21)</h2><div class="sd-block-body">
      <pre><code class="language-java">// one virtual thread
Thread.ofVirtual().name("vt-1").start(() -&gt; handle(request));

// executor: a NEW virtual thread per task — cheap, no pooling needed
try (var executor = java.util.concurrent.Executors.newVirtualThreadPerTaskExecutor()) {
    for (var task : tasks) executor.submit(task);
}   // close() waits for all tasks

// Structured concurrency (preview) — treat related tasks as a unit
try (var scope = new java.util.concurrent.StructuredTaskScope.ShutdownOnFailure()) {
    var user  = scope.fork(() -&gt; userService.find(id));
    var order = scope.fork(() -&gt; orderService.find(id));
    scope.join().throwIfFailed();              // wait for both; cancel siblings on failure
    return new Dashboard(user.get(), order.get());
}</code></pre>
      <p><strong>Spring Boot 3.2+:</strong> set <code>spring.threads.virtual.enabled=true</code> to run Tomcat request handling on virtual threads.</p>
    </div></section>
    <section class="sd-block" data-sec="compare"><h2 class="sd-h2">4. Platform vs Virtual Threads</h2><div class="sd-block-body">
      <table><thead><tr><th></th><th>Platform thread</th><th>Virtual thread</th></tr></thead><tbody>
        <tr><td>Backed by</td><td>OS thread</td><td>JVM (carrier pool)</td></tr>
        <tr><td>Cost</td><td>~1 MB stack</td><td>~ few hundred bytes</td></tr>
        <tr><td>Max count</td><td>Thousands</td><td>Millions</td></tr>
        <tr><td>Best for</td><td>CPU-bound</td><td>IO-bound (blocking calls)</td></tr>
        <tr><td>Pooling</td><td>Yes (reuse)</td><td>No — create per task</td></tr>
      </tbody></table>
      <div class="sd-callout warn"><span class="sd-callout-l">Pitfalls</span>Don't <strong>pool</strong> virtual threads (defeats the purpose). <code>synchronized</code> blocks can <em>pin</em> a virtual thread to its carrier (blocks the OS thread) — prefer <code>ReentrantLock</code> in hot paths. They don't speed up CPU-bound work.</div>
    </div></section>
    <section class="sd-block" data-sec="interview"><h2 class="sd-h2">5. Interview Q&amp;A</h2><div class="sd-block-body">
      <details class="sd-faq"><summary>How do virtual threads scale to millions?</summary><div>They're heap objects, not OS threads. Blocking unmounts them from a carrier, so an OS thread is never idle waiting on IO; a handful of carriers serve millions of mostly-blocked virtual threads.</div></details>
      <details class="sd-faq"><summary>Do they replace reactive (WebFlux)?</summary><div>For most IO-bound services, yes — you get async-like scalability with simple blocking code. Reactive still has niche advantages (backpressure, streaming composition).</div></details>
      <details class="sd-faq"><summary>What is "pinning"?</summary><div>When a virtual thread can't unmount — inside a <code>synchronized</code> block or native call — it holds its carrier OS thread, hurting scalability. Use <code>ReentrantLock</code> to avoid it.</div></details>
      <details class="sd-faq"><summary>Should you pool virtual threads?</summary><div>No. They're cheap to create; use <code>newVirtualThreadPerTaskExecutor()</code> (one per task). Pooling reintroduces the limit you were escaping.</div></details>
      <div class="sd-callout tip"><span class="sd-callout-l">Key takeaway</span>Virtual threads = millions of cheap JVM threads that unmount on blocking. Thread-per-request blocking code that scales. Don't pool; avoid <code>synchronized</code> in hot paths.</div>
    </div></section>
  `,

  "weakhashmap": `
    <section class="sd-block" data-sec="overview"><h2 class="sd-h2">1. Overview</h2><div class="sd-block-body">
      <p><code>WeakHashMap</code> holds its <strong>keys</strong> via weak references: once a key has no other strong reference, it becomes eligible for GC and its entry is automatically removed. Perfect for <strong>auto-cleaning caches/metadata</strong> keyed by objects whose lifecycle you don't control.</p>
    </div></section>
    <section class="sd-block" data-sec="internal"><h2 class="sd-h2">2. How it works</h2><div class="sd-block-body">
      <ul>
        <li>Entries wrap keys in <code>WeakReference</code> registered with a <code>ReferenceQueue</code>.</li>
        <li>When the GC clears a weakly-reachable key, the reference is enqueued; the next map operation drains the queue and removes stale entries (<code>expungeStaleEntries</code>).</li>
        <li><strong>Values are strong</strong> — if a value references its key, the key never dies (memory leak). Watch for that.</li>
      </ul>
      <pre class="mermaid">graph LR
  K[Key - no strong refs] -->|GC| C[Reference cleared]
  C --> Q[ReferenceQueue]
  Q --> X[entry auto-removed on next op]</pre>
    </div></section>
    <section class="sd-block" data-sec="java"><h2 class="sd-h2">3. Code</h2><div class="sd-block-body">
      <pre><code class="language-java">java.util.Map&lt;Key, Metadata&gt; cache = new java.util.WeakHashMap&lt;&gt;();
Key k = new Key("session-1");
cache.put(k, loadMetadata());
// ... while 'k' is strongly reachable, entry stays
k = null;                       // remove the only strong ref
System.gc();                    // key may be collected; entry disappears on next access
// cache.size() may now be 0</code></pre>
      <div class="sd-callout warn"><span class="sd-callout-l">Trap</span>If the value (or anything reachable from it) strongly references the key, the entry is never collected. Also not thread-safe — wrap or use a concurrent alternative (e.g. Caffeine with weak keys).</div>
    </div></section>
    <section class="sd-block" data-sec="interview"><h2 class="sd-h2">4. Interview Q&amp;A</h2><div class="sd-block-body">
      <details class="sd-faq"><summary>When would you use WeakHashMap?</summary><div>For metadata/caches keyed by objects you don't own, where entries should vanish when the key is no longer used elsewhere — avoiding manual cleanup and leaks (e.g. per-object listeners, ThreadLocal-like associations).</div></details>
      <details class="sd-faq"><summary>Why might entries NOT be collected?</summary><div>The value strongly references the key (cycle), or a strong reference to the key still exists somewhere. Weakness applies only to keys.</div></details>
      <details class="sd-faq"><summary>Is it thread-safe?</summary><div>No. For concurrent weak-keyed caches use Guava/Caffeine's <code>weakKeys()</code>.</div></details>
      <div class="sd-callout tip"><span class="sd-callout-l">Key takeaway</span>WeakHashMap auto-removes entries when keys become weakly reachable. Keys weak, values strong — beware value→key references.</div>
    </div></section>
  `,

  "reference-types": `
    <section class="sd-block" data-sec="overview"><h2 class="sd-h2">1. Overview</h2><div class="sd-block-body">
      <p>Java has four reference strengths controlling how the GC treats an object: <strong>Strong</strong>, <strong>Soft</strong>, <strong>Weak</strong>, and <strong>Phantom</strong>. They let you build memory-sensitive caches and post-mortem cleanup without leaking.</p>
    </div></section>
    <section class="sd-block" data-sec="types"><h2 class="sd-h2">2. The Four Strengths</h2><div class="sd-block-body">
      <table><thead><tr><th>Type</th><th>Collected when…</th><th>Use case</th><th><code>get()</code></th></tr></thead><tbody>
        <tr><td><strong>Strong</strong> (normal)</td><td>Never while reachable</td><td>Default references</td><td>n/a</td></tr>
        <tr><td><strong>SoftReference</strong></td><td>Only under memory pressure (before OOM)</td><td>Memory-sensitive caches</td><td>Returns object until cleared</td></tr>
        <tr><td><strong>WeakReference</strong></td><td>At next GC if only weakly reachable</td><td>Canonicalizing maps, metadata (WeakHashMap)</td><td>Returns or null</td></tr>
        <tr><td><strong>PhantomReference</strong></td><td>After finalization, before reclaim</td><td>Deterministic cleanup of native/off-heap resources</td><td>Always null</td></tr>
      </tbody></table>
      <p>Reachability order: strongly &gt; softly &gt; weakly &gt; phantom reachable. The GC clears the weakest first.</p>
    </div></section>
    <section class="sd-block" data-sec="java"><h2 class="sd-h2">3. Code</h2><div class="sd-block-body">
      <pre><code class="language-java">import java.lang.ref.*;

// Soft — survives until memory is tight (good cache)
SoftReference&lt;byte[]&gt; softCache = new SoftReference&lt;&gt;(loadImage());
byte[] img = softCache.get();           // may be null after memory pressure

// Weak — cleared at next GC if no strong refs
WeakReference&lt;Widget&gt; weak = new WeakReference&lt;&gt;(widget);

// Phantom — for cleanup; get() is always null; enqueued after object is finalized
ReferenceQueue&lt;Resource&gt; queue = new ReferenceQueue&lt;&gt;();
PhantomReference&lt;Resource&gt; phantom = new PhantomReference&lt;&gt;(resource, queue);
// A cleaner thread polls 'queue' and releases native handles deterministically
// (java.lang.ref.Cleaner is the modern, recommended API for this)
Cleaner cleaner = Cleaner.create();
cleaner.register(resource, () -&gt; freeNativeHandle());   // runs when resource is unreachable</code></pre>
    </div></section>
    <section class="sd-block" data-sec="interview"><h2 class="sd-h2">4. Interview Q&amp;A</h2><div class="sd-block-body">
      <details class="sd-faq"><summary>Soft vs Weak reference?</summary><div>Soft refs are cleared only when the JVM is about to run out of memory (great for caches that should shrink under pressure). Weak refs are cleared at the very next GC once no strong refs remain (great for metadata that should vanish promptly).</div></details>
      <details class="sd-faq"><summary>What's a PhantomReference for?</summary><div>Deterministic post-mortem cleanup of resources (native memory, file handles) — you learn the object is unreachable via a ReferenceQueue and free resources, avoiding the unreliable <code>finalize()</code>. Use <code>java.lang.ref.Cleaner</code> in modern code.</div></details>
      <details class="sd-faq"><summary>Why avoid finalize()?</summary><div>It's deprecated — unpredictable timing, can resurrect objects, hurts GC. Use <code>Cleaner</code>/<code>PhantomReference</code> or try-with-resources/<code>AutoCloseable</code>.</div></details>
      <div class="sd-callout tip"><span class="sd-callout-l">Key takeaway</span>Strong (default) → Soft (cache, clear on memory pressure) → Weak (clear next GC) → Phantom (post-mortem cleanup via Cleaner). Don't use finalize().</div>
    </div></section>
  `

});

/* ════════════════════════════ NETWORKING & REALTIME ════════════════════════════ */
Object.assign(window.SD_CONTENT, {

  "api-gateway": `
    <section class="sd-block" data-sec="overview"><h2 class="sd-h2">1. Overview</h2><div class="sd-block-body">
      <p>An <strong>API Gateway</strong> is the single entry point in front of a microservice fleet. It handles cross-cutting concerns — routing, authentication, rate limiting, TLS termination, request aggregation, observability — so individual services stay focused on business logic. Examples: Spring Cloud Gateway, Kong, AWS API Gateway, NGINX, Envoy.</p>
    </div></section>
    <section class="sd-block" data-sec="why"><h2 class="sd-h2">2. Why it exists / Responsibilities</h2><div class="sd-block-body">
      <ul>
        <li><strong>Routing &amp; load balancing</strong> to the right service instance.</li>
        <li><strong>AuthN/AuthZ</strong> at the edge (validate JWT once, not in every service).</li>
        <li><strong>Rate limiting / throttling</strong> &amp; quotas (see <a href="#rate-limiting">Rate Limiting</a>).</li>
        <li><strong>TLS termination</strong>, request/response transformation, API versioning.</li>
        <li><strong>Resilience:</strong> retries, timeouts, circuit breaking (see <a href="#circuit-breaker">Circuit Breaker</a>).</li>
        <li><strong>Observability:</strong> central logging, tracing, metrics; <strong>aggregation</strong> (BFF — combine several calls).</li>
      </ul>
      <pre class="mermaid">graph TD
  C[Clients - web/mobile] --> GW[API Gateway]
  GW -->|/users| U[User Service]
  GW -->|/orders| O[Order Service]
  GW -->|/pay| P[Payment Service]
  GW --> A[Auth / JWT validation]
  GW --> RL[Rate Limiter]</pre>
    </div></section>
    <section class="sd-block" data-sec="spring"><h2 class="sd-h2">3. Spring Cloud Gateway example</h2><div class="sd-block-body">
      <pre><code class="language-yaml">spring:
  cloud:
    gateway:
      routes:
        - id: user-service
          uri: lb://USER-SERVICE          # load-balanced via service discovery
          predicates:
            - Path=/api/users/**
          filters:
            - StripPrefix=2
            - name: RequestRateLimiter
              args:
                redis-rate-limiter.replenishRate: 100
                redis-rate-limiter.burstCapacity: 200
        - id: order-service
          uri: lb://ORDER-SERVICE
          predicates:
            - Path=/api/orders/**
          filters:
            - name: CircuitBreaker
              args: { name: orderCB, fallbackUri: forward:/fallback/orders }</code></pre>
      <h4>Custom global filter (auth at edge)</h4>
      <pre><code class="language-java">@Component
public class AuthGatewayFilter implements org.springframework.cloud.gateway.filter.GlobalFilter {
    private final JwtService jwt;
    public AuthGatewayFilter(JwtService jwt){ this.jwt = jwt; }
    @Override public reactor.core.publisher.Mono&lt;Void&gt; filter(
            org.springframework.web.server.ServerWebExchange ex,
            org.springframework.cloud.gateway.filter.GatewayFilterChain chain) {
        String auth = ex.getRequest().getHeaders().getFirst("Authorization");
        if (auth == null || !jwt.isValid(auth.replace("Bearer ", ""))) {
            ex.getResponse().setStatusCode(org.springframework.http.HttpStatus.UNAUTHORIZED);
            return ex.getResponse().setComplete();
        }
        return chain.filter(ex);   // forward with validated identity headers
    }
}</code></pre>
    </div></section>
    <section class="sd-block" data-sec="proscons"><h2 class="sd-h2">4. Advantages, Disadvantages & Pitfalls</h2><div class="sd-block-body">
      <h4>Advantages</h4><ul><li>Centralizes cross-cutting concerns; services stay simple.</li><li>One place for security, throttling, observability, versioning.</li><li>Decouples clients from internal topology.</li></ul>
      <h4>Disadvantages</h4><ul><li>Single point of failure → must run HA / multiple replicas.</li><li>Extra network hop (latency); can become a bottleneck.</li><li>Risk of a "god gateway" with business logic creeping in.</li></ul>
      <div class="sd-callout warn"><span class="sd-callout-l">Anti-pattern</span>Putting domain/business logic in the gateway. Keep it to cross-cutting concerns; aggregation belongs in a dedicated BFF if complex.</div>
    </div></section>
    <section class="sd-block" data-sec="interview"><h2 class="sd-h2">5. Interview Q&amp;A</h2><div class="sd-block-body">
      <details class="sd-faq"><summary>Gateway vs Load Balancer?</summary><div>A load balancer distributes traffic at L4/L7. A gateway is L7-aware and adds API concerns: auth, rate limiting, transformation, aggregation, routing by path/header. A gateway often uses an LB underneath.</div></details>
      <details class="sd-faq"><summary>How do you stop the gateway being a SPOF?</summary><div>Run multiple stateless gateway replicas behind a load balancer / DNS, across AZs; keep it stateless (state in Redis) so any instance can serve any request.</div></details>
      <details class="sd-faq"><summary>Where do you validate JWT — gateway or service?</summary><div>Validate signature/expiry at the gateway (fail fast), then forward identity claims as trusted headers; services do fine-grained authorization. Defense-in-depth: services can re-verify in zero-trust setups.</div></details>
      <details class="sd-faq"><summary>What is a BFF?</summary><div>Backend-for-Frontend: a gateway/aggregation layer tailored per client (web vs mobile) that composes multiple service calls into one response, reducing chatty round-trips.</div></details>
      <div class="sd-callout tip"><span class="sd-callout-l">Key takeaway</span>The gateway centralizes routing/auth/limiting/resilience/observability. Keep it stateless &amp; HA; no business logic.</div>
    </div></section>
  `,

  "authn-authz": `
    <section class="sd-block" data-sec="overview"><h2 class="sd-h2">1. Overview</h2><div class="sd-block-body">
      <p><strong>Authentication (AuthN)</strong> = "who are you?" (verify identity). <strong>Authorization (AuthZ)</strong> = "what may you do?" (verify permissions). Every secured system needs both; conflating them is a common security bug.</p>
    </div></section>
    <section class="sd-block" data-sec="models"><h2 class="sd-h2">2. Models</h2><div class="sd-block-body">
      <ul>
        <li><strong>AuthN methods:</strong> password + MFA, session cookies, JWT bearer tokens, OAuth2/OIDC, API keys, mTLS.</li>
        <li><strong>AuthZ models:</strong> <em>RBAC</em> (roles → permissions), <em>ABAC</em> (attribute/policy-based), <em>ACL</em> (per-resource lists), <em>ReBAC</em> (relationship-based, e.g. Google Zanzibar).</li>
      </ul>
      <pre class="mermaid">sequenceDiagram
  participant U as User
  participant G as Gateway
  participant A as Auth Service
  U->>A: login (credentials)
  A-->>U: token (JWT)
  U->>G: request + Bearer token
  G->>G: AuthN: verify signature/expiry
  G->>G: AuthZ: check roles/scopes
  G-->>U: 200 / 401 / 403</pre>
    </div></section>
    <section class="sd-block" data-sec="spring"><h2 class="sd-h2">3. Spring Security 6 — JWT resource server + method security</h2><div class="sd-block-body">
      <pre><code class="language-java">@Configuration
@EnableWebSecurity
@EnableMethodSecurity                      // enables @PreAuthorize
public class SecurityConfig {
    @Bean
    SecurityFilterChain chain(HttpSecurity http) throws Exception {
        http
          .csrf(csrf -&gt; csrf.disable())                         // stateless API
          .sessionManagement(s -&gt; s.sessionCreationPolicy(
              org.springframework.security.config.http.SessionCreationPolicy.STATELESS))
          .authorizeHttpRequests(auth -&gt; auth
              .requestMatchers("/api/public/**").permitAll()
              .requestMatchers("/api/admin/**").hasRole("ADMIN")
              .anyRequest().authenticated())
          .oauth2ResourceServer(o -&gt; o.jwt(org.springframework.security.config.Customizer.withDefaults()));
        return http.build();
    }
}

@RestController
class OrderController {
    @org.springframework.security.access.prepost.PreAuthorize("hasAuthority('SCOPE_orders:read') and #userId == authentication.name")
    @GetMapping("/api/orders/{userId}")
    public java.util.List&lt;Order&gt; mine(@PathVariable String userId){ /* ... */ return java.util.List.of(); }
}</code></pre>
    </div></section>
    <section class="sd-block" data-sec="security"><h2 class="sd-h2">4. Security Considerations</h2><div class="sd-block-body">
      <ul>
        <li><strong>Passwords:</strong> hash with BCrypt/Argon2 (never plaintext/MD5); add salt (built in).</li>
        <li><strong>Transport:</strong> TLS everywhere; HSTS.</li>
        <li><strong>Least privilege:</strong> default deny; grant minimal roles/scopes.</li>
        <li><strong>Common attacks:</strong> credential stuffing (rate-limit + MFA), session fixation (rotate IDs), CSRF (tokens / SameSite cookies), privilege escalation (server-side AuthZ, never trust client).</li>
      </ul>
    </div></section>
    <section class="sd-block" data-sec="interview"><h2 class="sd-h2">5. Interview Q&amp;A</h2><div class="sd-block-body">
      <details class="sd-faq"><summary>AuthN vs AuthZ?</summary><div>AuthN proves identity (login); AuthZ decides access (permissions). AuthN always precedes AuthZ. A valid token (authenticated) can still be forbidden (403) from a resource.</div></details>
      <details class="sd-faq"><summary>RBAC vs ABAC?</summary><div>RBAC grants by role (coarse, simple, scales operationally). ABAC evaluates attributes/policies (user dept, resource owner, time) for fine-grained, context-aware decisions — more flexible, more complex.</div></details>
      <details class="sd-faq"><summary>401 vs 403?</summary><div>401 Unauthorized = not authenticated (no/invalid credentials). 403 Forbidden = authenticated but lacking permission.</div></details>
      <details class="sd-faq"><summary>How to store passwords?</summary><div>Salted adaptive hash (BCrypt/Argon2/scrypt) with a tuned work factor; never reversible encryption or fast hashes.</div></details>
      <div class="sd-callout tip"><span class="sd-callout-l">Key takeaway</span>AuthN (identity) then AuthZ (permission). Default-deny, least-privilege, server-side checks, hashed passwords, TLS.</div>
    </div></section>
  `,

  "jwt-vs-session-oauth": `
    <section class="sd-block" data-sec="overview"><h2 class="sd-h2">1. Overview</h2><div class="sd-block-body">
      <p>Two ways to maintain authenticated state: <strong>server-side sessions</strong> (a session id cookie; state in the server/Redis) vs <strong>JWT</strong> (a self-contained signed token; stateless). <strong>OAuth2/OIDC</strong> is the delegation protocol that <em>issues</em> these tokens. Knowing the trade-offs (especially revocation) is a frequent interview topic.</p>
    </div></section>
    <section class="sd-block" data-sec="compare"><h2 class="sd-h2">2. JWT vs Session</h2><div class="sd-block-body">
      <table><thead><tr><th></th><th>Session (cookie)</th><th>JWT (bearer)</th></tr></thead><tbody>
        <tr><td>State</td><td>Server-side (memory/Redis/DB)</td><td>Stateless (in the token)</td></tr>
        <tr><td>Scalability</td><td>Needs shared session store</td><td>No lookup → scales trivially</td></tr>
        <tr><td>Revocation</td><td>Easy (delete server session)</td><td>Hard (valid until expiry) — needs denylist/short TTL</td></tr>
        <tr><td>Payload</td><td>Opaque id</td><td>Claims readable (base64, not encrypted)</td></tr>
        <tr><td>Best for</td><td>Monolith / same-origin web</td><td>Microservices, mobile, cross-domain APIs</td></tr>
        <tr><td>Transport</td><td>HttpOnly Secure cookie</td><td>Authorization: Bearer header</td></tr>
      </tbody></table>
    </div></section>
    <section class="sd-block" data-sec="jwt"><h2 class="sd-h2">3. JWT structure & code</h2><div class="sd-block-body">
      <p>A JWT is <code>header.payload.signature</code>, each base64url-encoded. The signature (HMAC or RSA) proves integrity; the payload is <strong>not encrypted</strong> — never put secrets in it.</p>
      <pre><code class="language-java">// Generate &amp; validate with jjwt
import io.jsonwebtoken.*; import javax.crypto.SecretKey;

public class JwtService {
    private final SecretKey key = io.jsonwebtoken.security.Keys.hmacShaKeyFor(secret.getBytes());
    public String issue(String userId, java.util.Set&lt;String&gt; roles) {
        return Jwts.builder()
            .subject(userId)
            .claim("roles", roles)
            .issuedAt(new java.util.Date())
            .expiration(new java.util.Date(System.currentTimeMillis() + 900_000)) // 15 min
            .signWith(key)
            .compact();
    }
    public Jws&lt;Claims&gt; parse(String token) {        // throws if invalid/expired/tampered
        return Jwts.parser().verifyWith(key).build().parseSignedClaims(token);
    }
}</code></pre>
      <h4>Access + Refresh token pattern</h4>
      <p>Short-lived <strong>access token</strong> (5–15 min) for requests; long-lived <strong>refresh token</strong> (stored httpOnly / in DB) to mint new access tokens. Revoke by deleting the refresh token server-side.</p>
    </div></section>
    <section class="sd-block" data-sec="oauth"><h2 class="sd-h2">4. OAuth2 / OIDC</h2><div class="sd-block-body">
      <p><strong>OAuth2</strong> delegates authorization (third-party access without sharing passwords). <strong>OIDC</strong> adds an identity layer (<code>id_token</code>) on top. Key roles: Resource Owner, Client, Authorization Server, Resource Server. The standard flow today is <strong>Authorization Code + PKCE</strong>.</p>
      <pre class="mermaid">sequenceDiagram
  participant U as User
  participant C as Client App
  participant AS as Auth Server
  participant RS as Resource Server
  U->>C: click "login with..."
  C->>AS: redirect (auth code + PKCE)
  U->>AS: authenticate + consent
  AS-->>C: authorization code
  C->>AS: code + verifier → tokens
  AS-->>C: access + refresh + id_token
  C->>RS: API call + access token
  RS-->>C: protected resource</pre>
    </div></section>
    <section class="sd-block" data-sec="interview"><h2 class="sd-h2">5. Interview Q&amp;A</h2><div class="sd-block-body">
      <details class="sd-faq"><summary>How do you revoke a JWT before it expires?</summary><div>JWTs are self-contained, so you can't "delete" them. Options: short TTL + refresh tokens, a server-side denylist (jti) checked on each request, or token versioning (bump a per-user version to invalidate all). This re-introduces some state — the cost of statelessness.</div></details>
      <details class="sd-faq"><summary>Is JWT payload encrypted?</summary><div>No — it's base64-encoded and readable by anyone. It's <em>signed</em> for integrity. For confidentiality use JWE or just don't put sensitive data in it.</div></details>
      <details class="sd-faq"><summary>When session over JWT?</summary><div>Same-origin web monoliths needing easy revocation and small cookies; sessions in Redis scale fine. JWT shines for stateless microservices, mobile, and cross-domain APIs.</div></details>
      <details class="sd-faq"><summary>Why Authorization Code + PKCE?</summary><div>PKCE protects public clients (SPA/mobile) from auth-code interception without a client secret. Implicit flow is deprecated.</div></details>
      <details class="sd-faq"><summary>Where do you store a JWT in a browser?</summary><div>Prefer an httpOnly, Secure, SameSite cookie (mitigates XSS token theft) over localStorage. Pair with CSRF protection.</div></details>
      <div class="sd-callout tip"><span class="sd-callout-l">Key takeaway</span>Session = stateful, easy revoke; JWT = stateless, scales, hard revoke (use short TTL + refresh + denylist). OAuth2/OIDC = the issuing protocol (Auth Code + PKCE).</div>
    </div></section>
  `,

  "rest-vs-grpc": `
    <section class="sd-block" data-sec="overview"><h2 class="sd-h2">1. Overview</h2><div class="sd-block-body">
      <p><strong>REST</strong> (JSON over HTTP/1.1) and <strong>gRPC</strong> (Protobuf over HTTP/2) are the two dominant service-communication styles. REST is universal and human-readable; gRPC is fast, strongly-typed, and streaming-capable — ideal for internal service-to-service calls.</p>
    </div></section>
    <section class="sd-block" data-sec="compare"><h2 class="sd-h2">2. Comparison</h2><div class="sd-block-body">
      <table><thead><tr><th>Aspect</th><th>REST</th><th>gRPC</th></tr></thead><tbody>
        <tr><td>Protocol</td><td>HTTP/1.1 (or 2)</td><td>HTTP/2</td></tr>
        <tr><td>Payload</td><td>JSON (text)</td><td>Protobuf (binary)</td></tr>
        <tr><td>Contract</td><td>OpenAPI (optional)</td><td><code>.proto</code> (mandatory, codegen)</td></tr>
        <tr><td>Performance</td><td>Good</td><td>Faster (binary, multiplexed, smaller)</td></tr>
        <tr><td>Streaming</td><td>Limited (SSE/chunked)</td><td>First-class: server/client/bidi</td></tr>
        <tr><td>Browser support</td><td>Native</td><td>Needs gRPC-Web proxy</td></tr>
        <tr><td>Human-readable</td><td>Yes</td><td>No (binary)</td></tr>
        <tr><td>Best for</td><td>Public APIs, browser clients</td><td>Internal microservices, low-latency, polyglot</td></tr>
      </tbody></table>
    </div></section>
    <section class="sd-block" data-sec="when"><h2 class="sd-h2">3. When to use which</h2><div class="sd-block-body">
      <ul>
        <li><strong>REST:</strong> public/partner APIs, browser/mobile clients, simple CRUD, when human-debuggability matters.</li>
        <li><strong>gRPC:</strong> internal east-west traffic, high throughput/low latency, streaming (telemetry, chat), strict polyglot contracts.</li>
        <li>Many systems do both: REST/GraphQL at the edge, gRPC between services.</li>
      </ul>
    </div></section>
    <section class="sd-block" data-sec="interview"><h2 class="sd-h2">4. Interview Q&amp;A</h2><div class="sd-block-body">
      <details class="sd-faq"><summary>Why is gRPC faster than REST?</summary><div>Binary Protobuf (smaller, faster to (de)serialize than JSON) over HTTP/2 (header compression, multiplexed streams on one connection, no head-of-line blocking at the HTTP layer).</div></details>
      <details class="sd-faq"><summary>Why isn't gRPC used for public browser APIs?</summary><div>Browsers can't speak raw HTTP/2 gRPC framing; you need a gRPC-Web proxy (Envoy). JSON/REST is natively consumable and easier for third parties.</div></details>
      <details class="sd-faq"><summary>What does the .proto contract buy you?</summary><div>A single source of truth that generates strongly-typed client/server stubs in many languages, with built-in backward-compatible evolution (field numbers).</div></details>
      <div class="sd-callout tip"><span class="sd-callout-l">Key takeaway</span>REST = universal, human-readable, public/browser. gRPC = binary HTTP/2, fast, streaming, typed — internal microservices.</div>
    </div></section>
  `,

  "grpc": `
    <section class="sd-block" data-sec="overview"><h2 class="sd-h2">1. Overview</h2><div class="sd-block-body">
      <p><strong>gRPC</strong> is a high-performance RPC framework: define services/messages in a <code>.proto</code> file, generate strongly-typed stubs, and call remote methods like local ones over HTTP/2 with Protobuf. It supports four call types including streaming.</p>
    </div></section>
    <section class="sd-block" data-sec="types"><h2 class="sd-h2">2. Four call types</h2><div class="sd-block-body">
      <ul>
        <li><strong>Unary:</strong> one request → one response (like REST).</li>
        <li><strong>Server streaming:</strong> one request → stream of responses (e.g. live prices).</li>
        <li><strong>Client streaming:</strong> stream of requests → one response (e.g. upload chunks).</li>
        <li><strong>Bidirectional streaming:</strong> both stream independently (e.g. chat).</li>
      </ul>
    </div></section>
    <section class="sd-block" data-sec="proto"><h2 class="sd-h2">3. .proto contract</h2><div class="sd-block-body">
      <pre><code class="language-protobuf">syntax = "proto3";
package order;
option java_package = "com.example.order.grpc";

service OrderService {
  rpc GetOrder (OrderRequest) returns (OrderResponse);                 // unary
  rpc WatchOrders (OrderRequest) returns (stream OrderResponse);       // server streaming
}
message OrderRequest  { string order_id = 1; }
message OrderResponse { string order_id = 1; string status = 2; double amount = 3; }</code></pre>
    </div></section>
    <section class="sd-block" data-sec="java"><h2 class="sd-h2">4. Java service + client</h2><div class="sd-block-body">
      <pre><code class="language-java">// Server: extend generated base class
public class OrderGrpcService extends OrderServiceGrpc.OrderServiceImplBase {
    @Override public void getOrder(OrderRequest req, io.grpc.stub.StreamObserver&lt;OrderResponse&gt; obs) {
        OrderResponse resp = OrderResponse.newBuilder()
            .setOrderId(req.getOrderId()).setStatus("CONFIRMED").setAmount(99.0).build();
        obs.onNext(resp);
        obs.onCompleted();
    }
}
// Start server
io.grpc.Server server = io.grpc.ServerBuilder.forPort(9090)
    .addService(new OrderGrpcService()).build().start();

// Client (blocking stub)
var channel = io.grpc.ManagedChannelBuilder.forAddress("localhost", 9090).usePlaintext().build();
var stub = OrderServiceGrpc.newBlockingStub(channel);
OrderResponse r = stub.getOrder(OrderRequest.newBuilder().setOrderId("123").build());</code></pre>
      <p><strong>Spring Boot:</strong> use the <code>grpc-spring-boot-starter</code> — annotate the service with <code>@GrpcService</code>.</p>
    </div></section>
    <section class="sd-block" data-sec="best"><h2 class="sd-h2">5. Best Practices & Pitfalls</h2><div class="sd-block-body">
      <ul><li>Evolve schemas safely: never reuse/renumber field tags; add new optional fields.</li><li>Set deadlines/timeouts on every call; use retries + circuit breakers.</li><li>Reuse channels (expensive to create); they multiplex over HTTP/2.</li><li>Use gRPC-Web + Envoy for browser clients.</li></ul>
    </div></section>
    <section class="sd-block" data-sec="interview"><h2 class="sd-h2">6. Interview Q&amp;A</h2><div class="sd-block-body">
      <details class="sd-faq"><summary>How does Protobuf stay backward compatible?</summary><div>Fields are identified by numeric tags, not names. Old code ignores unknown new fields; missing fields use defaults. Rule: never change/reuse a field number; only add new ones.</div></details>
      <details class="sd-faq"><summary>When use streaming?</summary><div>Continuous data (telemetry, prices, logs), large uploads in chunks, or interactive bidi (chat). For one-off request/response, unary is simpler.</div></details>
      <details class="sd-faq"><summary>Why reuse the channel?</summary><div>A channel manages an HTTP/2 connection pool; HTTP/2 multiplexes many concurrent calls over one connection, so one shared channel is efficient — creating per-call is wasteful.</div></details>
      <div class="sd-callout tip"><span class="sd-callout-l">Key takeaway</span>.proto contract → codegen → HTTP/2 + Protobuf with 4 call types. Add fields (never renumber); deadlines + channel reuse.</div>
    </div></section>
  `,

  "webhook": `
    <section class="sd-block" data-sec="overview"><h2 class="sd-h2">1. Overview</h2><div class="sd-block-body">
      <p>A <strong>Webhook</strong> is a reverse API: instead of you polling a provider, the provider <strong>pushes</strong> an HTTP POST to your registered URL when an event occurs (payment succeeded, PR merged, message received). It's event-driven integration between systems — used by Stripe, GitHub, Slack, Twilio.</p>
    </div></section>
    <section class="sd-block" data-sec="flow"><h2 class="sd-h2">2. How it works</h2><div class="sd-block-body">
      <pre class="mermaid">sequenceDiagram
  participant P as Provider (Stripe)
  participant Y as Your Endpoint
  Note over P: payment.succeeded event
  P->>Y: POST /webhooks/stripe (signed payload)
  Y->>Y: verify signature, dedup by event id
  Y-->>P: 200 quickly (ack)
  Y->>Y: process async (queue)
  Note over P: no 2xx? → provider retries with backoff</pre>
    </div></section>
    <section class="sd-block" data-sec="java"><h2 class="sd-h2">3. Spring Boot receiver — verify, ack fast, process async</h2><div class="sd-block-body">
      <pre><code class="language-java">@RestController
@RequestMapping("/webhooks")
public class StripeWebhookController {
    private final WebhookVerifier verifier;
    private final ProcessedEventRepo processed;     // for idempotency
    private final java.util.concurrent.ExecutorService pool;

    @PostMapping("/stripe")
    public org.springframework.http.ResponseEntity&lt;Void&gt; handle(
            @RequestBody String payload,
            @RequestHeader("Stripe-Signature") String sig) {
        if (!verifier.isValid(payload, sig))                 // 1) authenticate the sender
            return org.springframework.http.ResponseEntity.status(400).build();
        String eventId = verifier.extractId(payload);
        if (processed.existsById(eventId))                   // 2) idempotency — ignore duplicates
            return org.springframework.http.ResponseEntity.ok().build();
        processed.save(new ProcessedEvent(eventId));
        pool.submit(() -&gt; process(payload));                 // 3) process async, ack fast
        return org.springframework.http.ResponseEntity.ok().build();  // 4) 200 within timeout
    }
}</code></pre>
      <h4>Signature verification (HMAC)</h4>
      <pre><code class="language-java">boolean isValid(String payload, String signature) {
    javax.crypto.Mac mac = javax.crypto.Mac.getInstance("HmacSHA256");
    mac.init(new javax.crypto.spec.SecretKeySpec(secret.getBytes(), "HmacSHA256"));
    String expected = java.util.HexFormat.of().formatHex(mac.doFinal(payload.getBytes()));
    return java.security.MessageDigest.isEqual(expected.getBytes(), signature.getBytes()); // constant-time
}</code></pre>
    </div></section>
    <section class="sd-block" data-sec="best"><h2 class="sd-h2">4. Best Practices (receiver)</h2><div class="sd-block-body">
      <ul>
        <li><strong>Verify the signature</strong> (HMAC shared secret) — never trust an unauthenticated POST.</li>
        <li><strong>Be idempotent</strong> — providers retry, so dedupe by event id (see <a href="#idempotency">Idempotency</a>).</li>
        <li><strong>Respond fast (2xx)</strong> then process asynchronously (queue/worker) — slow handlers cause provider retries/timeouts.</li>
        <li>Return 5xx to trigger retry only for transient errors; 4xx for permanent ones.</li>
        <li>Whitelist source IPs / use mTLS where offered.</li>
      </ul>
    </div></section>
    <section class="sd-block" data-sec="interview"><h2 class="sd-h2">5. Interview Q&amp;A</h2><div class="sd-block-body">
      <details class="sd-faq"><summary>Webhook vs polling?</summary><div>Polling repeatedly asks "anything new?" (wasteful, laggy). Webhooks push only when something happens (efficient, real-time) but require a public endpoint and handling retries/duplicates.</div></details>
      <details class="sd-faq"><summary>How do you handle duplicate webhook deliveries?</summary><div>Providers guarantee at-least-once delivery, so dedupe by the event id in a store and make processing idempotent.</div></details>
      <details class="sd-faq"><summary>Why ack quickly then process async?</summary><div>Providers enforce a short timeout; if your synchronous handler is slow, they consider it failed and retry, causing duplicates and load. Persist/enqueue, return 200, process in the background.</div></details>
      <details class="sd-faq"><summary>How do you verify authenticity?</summary><div>HMAC signature over the raw body with a shared secret, compared in constant time; optionally IP allowlist / mTLS.</div></details>
      <div class="sd-callout tip"><span class="sd-callout-l">Key takeaway</span>Verify signature → dedupe (idempotent) → ack 2xx fast → process async. Expect retries &amp; duplicates.</div>
    </div></section>
  `,

  "websocket": `
    <section class="sd-block" data-sec="overview"><h2 class="sd-h2">1. Overview</h2><div class="sd-block-body">
      <p><strong>WebSocket</strong> is a full-duplex, persistent TCP connection between client and server over a single upgraded HTTP connection. Unlike request/response HTTP, either side can push messages anytime — powering chat, live dashboards, multiplayer games, collaborative editing and order tracking.</p>
    </div></section>
    <section class="sd-block" data-sec="howto"><h2 class="sd-h2">2. Handshake & lifecycle</h2><div class="sd-block-body">
      <p>Starts as HTTP with <code>Upgrade: websocket</code>; after the 101 Switching Protocols response, the same TCP connection carries bidirectional frames (no per-message HTTP overhead).</p>
      <pre class="mermaid">sequenceDiagram
  participant C as Client
  participant S as Server
  C->>S: HTTP GET Upgrade: websocket
  S-->>C: 101 Switching Protocols
  Note over C,S: persistent full-duplex channel
  C->>S: message
  S->>C: push (anytime)
  C->>S: close</pre>
    </div></section>
    <section class="sd-block" data-sec="compare"><h2 class="sd-h2">3. WebSocket vs alternatives</h2><div class="sd-block-body">
      <table><thead><tr><th>Technique</th><th>Direction</th><th>Use</th></tr></thead><tbody>
        <tr><td>Polling</td><td>Client pulls repeatedly</td><td>Simple, laggy, wasteful</td></tr>
        <tr><td>Long polling</td><td>Server holds request until data</td><td>Near-real-time fallback</td></tr>
        <tr><td>SSE (Server-Sent Events)</td><td>Server → client only</td><td>Live feeds/notifications (one-way)</td></tr>
        <tr><td><strong>WebSocket</strong></td><td>Bidirectional</td><td>Chat, games, collaboration</td></tr>
      </tbody></table>
    </div></section>
    <section class="sd-block" data-sec="java"><h2 class="sd-h2">4. Spring Boot — STOMP over WebSocket</h2><div class="sd-block-body">
      <pre><code class="language-java">@Configuration
@EnableWebSocketMessageBroker
public class WsConfig implements org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer {
    public void registerStompEndpoints(org.springframework.web.socket.config.annotation.StompEndpointRegistry r){
        r.addEndpoint("/ws").setAllowedOriginPatterns("*").withSockJS();   // fallback for old browsers
    }
    public void configureMessageBroker(org.springframework.messaging.simp.config.MessageBrokerRegistry r){
        r.enableSimpleBroker("/topic");      // in-memory broker; use RabbitMQ/Redis relay at scale
        r.setApplicationDestinationPrefixes("/app");
    }
}
@Controller
class ChatController {
    @org.springframework.messaging.handler.annotation.MessageMapping("/chat") // client sends to /app/chat
    @org.springframework.messaging.handler.annotation.SendTo("/topic/messages") // broadcast to subscribers
    public ChatMessage send(ChatMessage msg){ return msg; }
}</code></pre>
    </div></section>
    <section class="sd-block" data-sec="scale"><h2 class="sd-h2">5. Scaling & Best Practices</h2><div class="sd-block-body">
      <ul>
        <li><strong>Stateful connections</strong> — a user is pinned to one server. Use sticky sessions or a shared broker (Redis pub/sub, RabbitMQ STOMP relay) so any node can deliver to any user.</li>
        <li><strong>Connection limits</strong> — each socket consumes memory/FD; size capacity, use heartbeats to detect dead clients.</li>
        <li><strong>Auth</strong> — validate a token on the handshake (query param/header) and on subscribe; you can't rely on cookies cross-origin.</li>
        <li>Reconnect with backoff on the client; consider virtual threads / Netty for many connections.</li>
      </ul>
      <pre class="mermaid">graph TD
  C1[Client A] --> N1[WS Node 1]
  C2[Client B] --> N2[WS Node 2]
  N1 --> R[(Redis Pub/Sub)]
  N2 --> R
  R --> N1
  R --> N2</pre>
    </div></section>
    <section class="sd-block" data-sec="interview"><h2 class="sd-h2">6. Interview Q&amp;A</h2><div class="sd-block-body">
      <details class="sd-faq"><summary>WebSocket vs SSE?</summary><div>SSE is one-way (server→client) over plain HTTP, auto-reconnecting, simpler — great for feeds/notifications. WebSocket is bidirectional and binary-capable — needed when the client also pushes (chat, games).</div></details>
      <details class="sd-faq"><summary>How do you scale WebSockets across nodes?</summary><div>Connections are sticky to a node; use a shared message broker (Redis pub/sub or RabbitMQ relay) so a message published on any node reaches subscribers connected to other nodes.</div></details>
      <details class="sd-faq"><summary>How do you authenticate a WebSocket?</summary><div>Validate a JWT during the HTTP upgrade handshake (and per-subscription for fine-grained topics), since browsers can't set custom headers on the WS handshake — pass the token via a subprotocol/query param or initial STOMP CONNECT frame.</div></details>
      <details class="sd-faq"><summary>How to detect dead connections?</summary><div>Application-level heartbeats/ping-pong frames with timeouts; close and let the client reconnect with backoff.</div></details>
      <div class="sd-callout tip"><span class="sd-callout-l">Key takeaway</span>WebSocket = persistent full-duplex channel for real-time bidirectional push. Scale via sticky sessions + a shared broker; auth on handshake.</div>
    </div></section>
  `

});

/* ════════════════════════════ DATABASES & API DATA ACCESS ════════════════════════════ */
Object.assign(window.SD_CONTENT, {

  "database-indexing": `
    <section class="sd-block" data-sec="overview"><h2 class="sd-h2">1. Overview</h2><div class="sd-block-body">
      <p>An <strong>index</strong> is an auxiliary data structure that lets the database find rows without scanning the whole table — turning O(n) full scans into O(log n) lookups. It's the single biggest lever for query performance. The cost: extra storage and slower writes (every insert/update maintains the index).</p>
    </div></section>
    <section class="sd-block" data-sec="internal"><h2 class="sd-h2">2. Internal Working — B+ Tree</h2><div class="sd-block-body">
      <p>Most relational indexes are <strong>B+ trees</strong>: balanced, high-fanout trees where all values live in sorted leaf nodes linked together. This gives O(log n) point lookups <em>and</em> efficient range scans (follow leaf links). <strong>Hash indexes</strong> give O(1) equality but no ranges.</p>
      <pre class="mermaid">graph TD
  R[Root] --> I1[Internal]
  R --> I2[Internal]
  I1 --> L1[Leaf: 10,20]
  I1 --> L2[Leaf: 30,40]
  I2 --> L3[Leaf: 50,60]
  L1 --- L2 --- L3</pre>
      <ul>
        <li><strong>Clustered index</strong> (PK in MySQL/InnoDB): table rows are physically stored in index order — one per table.</li>
        <li><strong>Secondary/non-clustered index</strong>: stores the key + a pointer to the row.</li>
        <li><strong>Covering index</strong>: includes all columns a query needs → answered from the index alone (no table lookup).</li>
        <li><strong>Composite index</strong> on (a,b,c): usable for filters on a, a+b, a+b+c (left-prefix rule), not b alone.</li>
      </ul>
    </div></section>
    <section class="sd-block" data-sec="java"><h2 class="sd-h2">3. SQL & JPA</h2><div class="sd-block-body">
      <pre><code class="language-sql">-- composite + covering index for "orders by user, recent first"
CREATE INDEX idx_orders_user_created ON orders (user_id, created_at DESC) INCLUDE (status, amount);

-- inspect the plan — look for "Index Scan", avoid "Seq Scan" on big tables
EXPLAIN ANALYZE SELECT status, amount FROM orders
WHERE user_id = 42 ORDER BY created_at DESC LIMIT 20;</code></pre>
      <pre><code class="language-java">@Entity
@org.hibernate.annotations.Table(appliesTo = "orders")
@jakarta.persistence.Table(name = "orders", indexes = {
    @jakarta.persistence.Index(name = "idx_orders_user_created", columnList = "user_id, created_at")
})
public class OrderEntity { /* ... */ }</code></pre>
    </div></section>
    <section class="sd-block" data-sec="best"><h2 class="sd-h2">4. Best Practices & Common Mistakes</h2><div class="sd-block-body">
      <h4>Best practices</h4><ul><li>Index columns in <code>WHERE</code>, <code>JOIN</code>, <code>ORDER BY</code> with high selectivity.</li><li>Put the most selective / equality column first in composite indexes; match query order.</li><li>Use covering indexes for hot read paths.</li><li>Always read <code>EXPLAIN ANALYZE</code> before/after.</li></ul>
      <h4>Common mistakes</h4><ul><li>Over-indexing → bloated writes &amp; storage.</li><li>Functions/implicit casts on the column (<code>WHERE LOWER(email)=…</code>) defeat the index — use a functional index.</li><li>Indexing low-cardinality columns (e.g. boolean) — rarely helps.</li><li>Ignoring the left-prefix rule for composite indexes.</li></ul>
    </div></section>
    <section class="sd-block" data-sec="interview"><h2 class="sd-h2">5. Interview Q&amp;A</h2><div class="sd-block-body">
      <details class="sd-faq"><summary>Why B+ tree over hash for most indexes?</summary><div>B+ trees support range/sort/prefix queries (ordered leaves) in addition to equality, while hash indexes only do equality. Most workloads need ranges and ORDER BY.</div></details>
      <details class="sd-faq"><summary>Clustered vs non-clustered?</summary><div>Clustered = the table itself sorted by the index key (one per table; range scans are fast). Non-clustered = separate structure pointing back to rows; a lookup may need an extra "bookmark" fetch unless it's covering.</div></details>
      <details class="sd-faq"><summary>Why can an index make things slower?</summary><div>Writes must update every index; too many indexes slow inserts/updates and bloat storage. Also a non-selective index may be ignored by the planner in favor of a seq scan.</div></details>
      <details class="sd-faq"><summary>Composite index (a,b) — does it help a query on b only?</summary><div>No (left-prefix rule). It helps a, or a+b. For b-only, you need a separate index.</div></details>
      <div class="sd-callout tip"><span class="sd-callout-l">Key takeaway</span>Indexes = B+ trees for O(log n) lookups + ranges; cover hot reads; respect left-prefix; verify with EXPLAIN. Trade write cost for read speed.</div>
    </div></section>
  `,

  "n-plus-1": `
    <section class="sd-block" data-sec="overview"><h2 class="sd-h2">1. Overview</h2><div class="sd-block-body">
      <p>The <strong>N+1 query problem</strong> is the most common ORM performance bug: fetching N parent rows then firing one extra query per parent to load its children → 1 + N queries instead of 1–2. It silently kills latency as data grows.</p>
    </div></section>
    <section class="sd-block" data-sec="cause"><h2 class="sd-h2">2. The cause</h2><div class="sd-block-body">
      <pre><code class="language-java">// Fetch 100 orders, then access each order's items lazily
List&lt;Order&gt; orders = orderRepo.findAll();          // 1 query
for (Order o : orders) {
    o.getItems().size();                            // +1 query EACH → 100 more queries!
}
// Total: 1 + 100 = 101 queries</code></pre>
      <pre class="mermaid">graph TD
  Q1[SELECT * FROM orders] --> L[loop 100 orders]
  L --> Q2[SELECT * FROM items WHERE order_id = ? x100]</pre>
    </div></section>
    <section class="sd-block" data-sec="fix"><h2 class="sd-h2">3. Fixes</h2><div class="sd-block-body">
      <h4>JOIN FETCH (single query)</h4>
      <pre><code class="language-java">@org.springframework.data.jpa.repository.Query(
  "SELECT DISTINCT o FROM Order o JOIN FETCH o.items WHERE o.userId = :uid")
List&lt;Order&gt; findWithItems(@org.springframework.data.repository.query.Param("uid") Long uid);</code></pre>
      <h4>@EntityGraph (declarative)</h4>
      <pre><code class="language-java">@org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"items"})
List&lt;Order&gt; findByUserId(Long userId);</code></pre>
      <h4>Batch fetching (for collections of collections)</h4>
      <pre><code class="language-properties"># Hibernate loads children in batches (e.g. IN clauses of 50) instead of one-by-one
spring.jpa.properties.hibernate.default_batch_fetch_size=50</code></pre>
      <table><thead><tr><th>Fix</th><th>When</th><th>Caveat</th></tr></thead><tbody>
        <tr><td>JOIN FETCH</td><td>Single collection</td><td>Cartesian blow-up with multiple collections; use DISTINCT</td></tr>
        <tr><td>@EntityGraph</td><td>Declarative eager paths</td><td>Same cartesian caveat</td></tr>
        <tr><td>batch_fetch_size</td><td>Many / nested collections</td><td>A few extra queries (1 + N/batch)</td></tr>
        <tr><td>DTO projection</td><td>Read-only views</td><td>No entity graph; write a tailored query</td></tr>
      </tbody></table>
    </div></section>
    <section class="sd-block" data-sec="detect"><h2 class="sd-h2">4. Detection</h2><div class="sd-block-body">
      <ul><li>Log SQL: <code>spring.jpa.show-sql=true</code> / <code>hibernate.generate_statistics=true</code>.</li><li>Use <strong>Hypersistence Utils</strong> or datasource-proxy to assert query counts in tests.</li><li>APM (tracing) shows a burst of identical small queries per request.</li></ul>
    </div></section>
    <section class="sd-block" data-sec="interview"><h2 class="sd-h2">5. Interview Q&amp;A</h2><div class="sd-block-body">
      <details class="sd-faq"><summary>What causes N+1?</summary><div>Lazy associations accessed in a loop: the ORM issues one query per parent to load its lazy children. Default <code>@OneToMany</code> is LAZY, so iterating triggers it.</div></details>
      <details class="sd-faq"><summary>JOIN FETCH vs EntityGraph vs batch size?</summary><div>JOIN FETCH/EntityGraph collapse to one join query (best for a single collection). For multiple/nested collections, batch fetching avoids cartesian explosion at the cost of a few IN queries.</div></details>
      <details class="sd-faq"><summary>Why is <code>FetchType.EAGER</code> not the fix?</summary><div>Global EAGER causes its own over-fetching and N+1 in other queries. Keep associations LAZY and fetch explicitly per use case.</div></details>
      <div class="sd-callout tip"><span class="sd-callout-l">Key takeaway</span>N+1 = lazy load in a loop. Fix with JOIN FETCH / @EntityGraph (single collection) or batch fetching (nested), and assert query counts in tests.</div>
    </div></section>
  `,

  "pagination": `
    <section class="sd-block" data-sec="overview"><h2 class="sd-h2">1. Overview</h2><div class="sd-block-body">
      <p><strong>Pagination</strong> returns large result sets in chunks. The naive <code>OFFSET/LIMIT</code> approach degrades badly on deep pages; <strong>keyset (cursor) pagination</strong> stays fast at any depth. Choosing correctly is a common senior question.</p>
    </div></section>
    <section class="sd-block" data-sec="compare"><h2 class="sd-h2">2. Offset vs Keyset</h2><div class="sd-block-body">
      <table><thead><tr><th></th><th>Offset (LIMIT/OFFSET)</th><th>Keyset (cursor)</th></tr></thead><tbody>
        <tr><td>Query</td><td><code>… LIMIT 20 OFFSET 10000</code></td><td><code>… WHERE id &lt; :lastId ORDER BY id DESC LIMIT 20</code></td></tr>
        <tr><td>Deep-page cost</td><td>O(offset) — scans+discards skipped rows</td><td>O(1)/O(log n) via index</td></tr>
        <tr><td>Random page jump</td><td>Yes (page 500)</td><td>No (next/prev only)</td></tr>
        <tr><td>Consistency under inserts</td><td>Can skip/duplicate rows</td><td>Stable</td></tr>
        <tr><td>Total count</td><td>Easy</td><td>Expensive/approximate</td></tr>
      </tbody></table>
    </div></section>
    <section class="sd-block" data-sec="java"><h2 class="sd-h2">3. Code</h2><div class="sd-block-body">
      <h4>Offset (Spring Data) — fine for shallow pages</h4>
      <pre><code class="language-java">Page&lt;Order&gt; page = orderRepo.findAll(
    org.springframework.data.domain.PageRequest.of(pageNo, 20,
        org.springframework.data.domain.Sort.by("createdAt").descending()));
// page.getTotalElements(), page.getContent()</code></pre>
      <h4>Keyset — fast at any depth</h4>
      <pre><code class="language-java">@Query("SELECT o FROM Order o WHERE o.id &lt; :cursor ORDER BY o.id DESC")
List&lt;Order&gt; nextPage(@Param("cursor") long cursor, org.springframework.data.domain.Pageable limit);
// first call: cursor = Long.MAX_VALUE; next cursor = last id of returned page
// API returns an opaque base64 cursor token instead of a page number</code></pre>
    </div></section>
    <section class="sd-block" data-sec="best"><h2 class="sd-h2">4. Best Practices</h2><div class="sd-block-body">
      <ul><li>Public/infinite-scroll APIs → <strong>keyset</strong> (stable, fast).</li><li>Admin tables needing "jump to page N" / counts → offset (cap max offset).</li><li>Always have an index on the sort/cursor column; ensure a deterministic tie-breaker (e.g. <code>(created_at, id)</code>).</li><li>Return an opaque cursor token; never leak raw internal ids if sensitive.</li></ul>
    </div></section>
    <section class="sd-block" data-sec="interview"><h2 class="sd-h2">5. Interview Q&amp;A</h2><div class="sd-block-body">
      <details class="sd-faq"><summary>Why is OFFSET slow on deep pages?</summary><div>The DB must read and discard all <code>OFFSET</code> rows before returning the page — page 10,000 reads ~200k rows. Keyset jumps straight to the cursor via the index.</div></details>
      <details class="sd-faq"><summary>Why can offset pagination skip/duplicate rows?</summary><div>If rows are inserted/deleted between page requests, offsets shift, so a row can be missed or repeated. Keyset anchored on a stable key avoids this.</div></details>
      <details class="sd-faq"><summary>How do you do a tie-breaker?</summary><div>Sort by a unique composite like <code>(created_at, id)</code> and carry both in the cursor, so equal timestamps don't cause skips.</div></details>
      <div class="sd-callout tip"><span class="sd-callout-l">Key takeaway</span>Keyset (cursor) pagination for scale &amp; stability; offset only for shallow pages / page-jumping admin views. Index the cursor column.</div>
    </div></section>
  `,

  "transactions-isolation": `
    <section class="sd-block" data-sec="overview"><h2 class="sd-h2">1. Overview</h2><div class="sd-block-body">
      <p>A <strong>transaction</strong> groups operations into an all-or-nothing unit with <strong>ACID</strong> guarantees. <strong>Isolation levels</strong> trade correctness against concurrency by controlling which anomalies (dirty/non-repeatable/phantom reads) are possible. Essential for any system touching money or inventory.</p>
    </div></section>
    <section class="sd-block" data-sec="acid"><h2 class="sd-h2">2. ACID</h2><div class="sd-block-body">
      <ul>
        <li><strong>Atomicity:</strong> all operations commit or none do.</li>
        <li><strong>Consistency:</strong> constraints/invariants hold before and after.</li>
        <li><strong>Isolation:</strong> concurrent transactions don't corrupt each other (level-dependent).</li>
        <li><strong>Durability:</strong> committed data survives crashes (WAL/redo log).</li>
      </ul>
    </div></section>
    <section class="sd-block" data-sec="levels"><h2 class="sd-h2">3. Isolation levels & anomalies</h2><div class="sd-block-body">
      <table><thead><tr><th>Level</th><th>Dirty read</th><th>Non-repeatable</th><th>Phantom</th></tr></thead><tbody>
        <tr><td>READ UNCOMMITTED</td><td>✗ possible</td><td>✗</td><td>✗</td></tr>
        <tr><td>READ COMMITTED <em>(Pg default)</em></td><td>✓ prevented</td><td>✗</td><td>✗</td></tr>
        <tr><td>REPEATABLE READ <em>(MySQL default)</em></td><td>✓</td><td>✓</td><td>✗ (Pg: also prevents)</td></tr>
        <tr><td>SERIALIZABLE</td><td>✓</td><td>✓</td><td>✓</td></tr>
      </tbody></table>
      <ul>
        <li><strong>Dirty read:</strong> see another txn's uncommitted change.</li>
        <li><strong>Non-repeatable read:</strong> re-reading a row gives a different value (another txn updated+committed).</li>
        <li><strong>Phantom read:</strong> a range query returns new rows on re-execution.</li>
      </ul>
    </div></section>
    <section class="sd-block" data-sec="java"><h2 class="sd-h2">4. Spring @Transactional + locking</h2><div class="sd-block-body">
      <pre><code class="language-java">@Service
public class TransferService {
    @org.springframework.transaction.annotation.Transactional(
        isolation = org.springframework.transaction.annotation.Isolation.READ_COMMITTED,
        rollbackFor = Exception.class)
    public void transfer(long fromId, long toId, java.math.BigDecimal amt) {
        var from = accountRepo.findByIdForUpdate(fromId);   // pessimistic lock
        var to   = accountRepo.findByIdForUpdate(toId);
        if (from.getBalance().compareTo(amt) &lt; 0) throw new InsufficientFundsException();
        from.debit(amt); to.credit(amt);
        // both saved or both rolled back
    }
}

// Pessimistic lock (SELECT ... FOR UPDATE)
@org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
@Query("SELECT a FROM Account a WHERE a.id = :id")
Account findByIdForUpdate(@Param("id") long id);

// Optimistic lock (no DB lock; version column)
@jakarta.persistence.Version private long version;   // throws OptimisticLockException on conflict</code></pre>
    </div></section>
    <section class="sd-block" data-sec="best"><h2 class="sd-h2">5. Best Practices & Pitfalls</h2><div class="sd-block-body">
      <ul>
        <li>Keep transactions <strong>short</strong>; never do remote calls / user wait inside one (holds locks).</li>
        <li><strong>Optimistic locking</strong> (version) for low-contention; <strong>pessimistic</strong> (FOR UPDATE) for hot rows.</li>
        <li>Spring rolls back only on unchecked exceptions by default — set <code>rollbackFor</code> for checked ones.</li>
        <li><code>@Transactional</code> self-invocation (calling a transactional method from the same bean) bypasses the proxy → no transaction.</li>
        <li>Higher isolation = more locks/aborts; pick the lowest level that prevents the anomaly you care about.</li>
      </ul>
    </div></section>
    <section class="sd-block" data-sec="interview"><h2 class="sd-h2">6. Interview Q&amp;A</h2><div class="sd-block-body">
      <details class="sd-faq"><summary>Explain the three read anomalies.</summary><div>Dirty = read uncommitted data; Non-repeatable = same row differs on re-read (update committed in between); Phantom = same range query returns new/removed rows.</div></details>
      <details class="sd-faq"><summary>Optimistic vs pessimistic locking?</summary><div>Optimistic assumes no conflict — checks a version on commit and retries on clash (great for low contention, no DB locks). Pessimistic takes a row lock up front (<code>FOR UPDATE</code>) — safer for hot rows but reduces concurrency and risks deadlock.</div></details>
      <details class="sd-faq"><summary>Why might @Transactional not work?</summary><div>Self-invocation (proxy bypass), a non-public method, a swallowed exception, or a checked exception without <code>rollbackFor</code>.</div></details>
      <details class="sd-faq"><summary>SERIALIZABLE — why not always?</summary><div>It serializes conflicting transactions (locks or serialization failures + retries) → throughput drops. Use only where the strongest correctness is required.</div></details>
      <div class="sd-callout tip"><span class="sd-callout-l">Key takeaway</span>ACID + pick the lowest isolation that blocks your anomaly. Short transactions; optimistic vs pessimistic locking by contention; mind Spring's rollback &amp; proxy rules.</div>
    </div></section>
  `,

  "connection-pooling": `
    <section class="sd-block" data-sec="overview"><h2 class="sd-h2">1. Overview</h2><div class="sd-block-body">
      <p>Opening a DB connection (TCP + auth + TLS) costs tens of milliseconds — far too slow to do per request. A <strong>connection pool</strong> keeps a set of open connections and lends them out, so requests reuse warm connections. <strong>HikariCP</strong> is the default, fastest pool in Spring Boot.</p>
    </div></section>
    <section class="sd-block" data-sec="internal"><h2 class="sd-h2">2. How it works</h2><div class="sd-block-body">
      <p>On <code>getConnection()</code> the pool hands out an idle connection (or waits up to <code>connectionTimeout</code> if none free); on <code>close()</code> the connection is <em>returned</em> to the pool, not actually closed. Hikari minimizes overhead with a lock-free <code>ConcurrentBag</code>, bytecode-level proxies and few moving parts.</p>
      <pre class="mermaid">graph TD
  R[Request] --> P{idle conn?}
  P -- yes --> U[borrow]
  P -- no --> M{below max?}
  M -- yes --> N[open new]
  M -- no --> W[wait up to connectionTimeout]
  W -- timeout --> X[SQLException]
  U --> Q[run query]
  Q --> RET[return to pool on close]</pre>
    </div></section>
    <section class="sd-block" data-sec="config"><h2 class="sd-h2">3. Configuration & sizing</h2><div class="sd-block-body">
      <pre><code class="language-properties">spring.datasource.hikari.maximum-pool-size=10
spring.datasource.hikari.minimum-idle=10
spring.datasource.hikari.connection-timeout=30000     # wait for a free conn (ms)
spring.datasource.hikari.idle-timeout=600000
spring.datasource.hikari.max-lifetime=1800000         # recycle before DB-side timeout
spring.datasource.hikari.leak-detection-threshold=20000</code></pre>
      <div class="sd-callout info"><span class="sd-callout-l">Sizing</span>Bigger is NOT better. A good starting point: <code>pool = ((core_count × 2) + effective_spindles)</code>. Often 10–20 is plenty — the DB itself is the bottleneck. Total connections across all app instances must stay under the DB's <code>max_connections</code>.</div>
    </div></section>
    <section class="sd-block" data-sec="prod"><h2 class="sd-h2">4. Production Issues</h2><div class="sd-block-body">
      <ul>
        <li><strong>Connection pool exhaustion:</strong> all connections borrowed → requests block then time out. Causes: long-running queries, leaked connections (not closed), pool too small, or a slow DB. Symptom: <code>HikariPool - Connection is not available, request timed out</code>.</li>
        <li><strong>Leaks:</strong> a connection borrowed and never returned (missing try-with-resources / transaction never committed). Enable <code>leak-detection-threshold</code>.</li>
        <li><strong>Stale connections:</strong> DB or firewall closes idle connections; set <code>max-lifetime</code> below the DB timeout.</li>
        <li><strong>Monitor:</strong> Micrometer exposes <code>hikaricp.connections.active/idle/pending</code> → alert on pending &gt; 0.</li>
      </ul>
    </div></section>
    <section class="sd-block" data-sec="interview"><h2 class="sd-h2">5. Interview Q&amp;A</h2><div class="sd-block-body">
      <details class="sd-faq"><summary>Why pool connections?</summary><div>Establishing a connection (TCP handshake, auth, TLS) is expensive (10s of ms). Pooling amortizes that by reusing warm connections, cutting per-request latency dramatically.</div></details>
      <details class="sd-faq"><summary>Why is a huge pool bad?</summary><div>More connections than the DB can effectively serve causes context-switching and lock contention on the DB, increasing latency. Throughput is bounded by DB cores/IO, not app threads. Right-size small.</div></details>
      <details class="sd-faq"><summary>How do you debug pool exhaustion?</summary><div>Check active vs idle vs pending metrics; find slow/leaked queries (long-held connections); enable leak detection; verify connections are closed (try-with-resources) and transactions are short.</div></details>
      <details class="sd-faq"><summary>Why set max-lifetime?</summary><div>To proactively retire connections before the database or a network device silently drops idle ones, avoiding "broken pipe" errors on reuse.</div></details>
      <div class="sd-callout tip"><span class="sd-callout-l">Key takeaway</span>Pools reuse expensive connections. Size small (DB is the bottleneck), set max-lifetime &lt; DB timeout, monitor pending, and watch for leaks.</div>
    </div></section>
  `,

  "sharding-partitioning": `
    <section class="sd-block" data-sec="overview"><h2 class="sd-h2">1. Overview</h2><div class="sd-block-body">
      <p>When one database can't hold the data or handle the load, you split it. <strong>Partitioning</strong> divides a table within one database; <strong>sharding</strong> spreads data across multiple databases/servers (horizontal scaling). Both improve performance and manageability — sharding adds operational complexity.</p>
    </div></section>
    <section class="sd-block" data-sec="types"><h2 class="sd-h2">2. Partitioning vs Sharding</h2><div class="sd-block-body">
      <ul>
        <li><strong>Vertical partitioning:</strong> split columns into separate tables (hot vs cold/blob columns).</li>
        <li><strong>Horizontal partitioning:</strong> split rows by a key (range/list/hash) — within one DB (e.g. Postgres declarative partitions by month).</li>
        <li><strong>Sharding:</strong> horizontal partitioning across <em>independent</em> database servers, each holding a subset.</li>
      </ul>
      <pre class="mermaid">graph TD
  A[App] --> R{shard router}
  R -->|hash user_id| S1[(Shard 1: users A-H)]
  R --> S2[(Shard 2: users I-P)]
  R --> S3[(Shard 3: users Q-Z)]</pre>
    </div></section>
    <section class="sd-block" data-sec="strategies"><h2 class="sd-h2">3. Shard-key strategies</h2><div class="sd-block-body">
      <table><thead><tr><th>Strategy</th><th>How</th><th>Pros / Cons</th></tr></thead><tbody>
        <tr><td><strong>Range</strong></td><td>By key range (A–M, N–Z)</td><td>Easy range scans; hotspots if skewed</td></tr>
        <tr><td><strong>Hash</strong></td><td><code>hash(key) % N</code></td><td>Even spread; range queries fan out; resharding pain</td></tr>
        <tr><td><strong>Consistent hashing</strong></td><td>Hash ring</td><td>Minimal data movement when adding shards</td></tr>
        <tr><td><strong>Directory/lookup</strong></td><td>A map of key→shard</td><td>Flexible rebalancing; the lookup is a SPOF/extra hop</td></tr>
        <tr><td><strong>Geo</strong></td><td>By region</td><td>Data locality/compliance; uneven load</td></tr>
      </tbody></table>
    </div></section>
    <section class="sd-block" data-sec="challenges"><h2 class="sd-h2">4. Challenges</h2><div class="sd-block-body">
      <ul>
        <li><strong>Cross-shard queries/joins</strong> become application-side scatter-gather (slow). Pick a shard key that keeps related data together.</li>
        <li><strong>Cross-shard transactions</strong> lose easy ACID → use sagas / 2PC (see <a href="#saga-pattern">SAGA</a>).</li>
        <li><strong>Hotspots / celebrity problem:</strong> a popular key overloads one shard.</li>
        <li><strong>Resharding:</strong> adding shards forces data migration; consistent hashing/virtual shards reduce churn.</li>
        <li><strong>Global uniqueness:</strong> use UUID/Snowflake IDs instead of per-shard auto-increment.</li>
      </ul>
    </div></section>
    <section class="sd-block" data-sec="interview"><h2 class="sd-h2">5. Interview Q&amp;A</h2><div class="sd-block-body">
      <details class="sd-faq"><summary>Partitioning vs sharding?</summary><div>Partitioning splits a table within a single database (the DB manages it). Sharding distributes data across multiple independent database servers — the application/router must locate the right shard.</div></details>
      <details class="sd-faq"><summary>How do you choose a shard key?</summary><div>High cardinality + even distribution + co-locates data accessed together (e.g. tenant_id / user_id). A bad key causes hotspots or constant cross-shard fan-out.</div></details>
      <details class="sd-faq"><summary>Why consistent hashing?</summary><div>Plain <code>hash % N</code> remaps almost every key when N changes (massive migration). Consistent hashing only moves keys on the affected ring segment when adding/removing a shard.</div></details>
      <details class="sd-faq"><summary>How do you do a cross-shard JOIN?</summary><div>Avoid it — denormalize or co-locate. If unavoidable, scatter-gather (query each shard, merge in the app) or maintain a search/read store (e.g. Elasticsearch) for cross-cutting queries.</div></details>
      <details class="sd-faq"><summary>When should you NOT shard?</summary><div>Until you must — first exhaust indexing, caching, read replicas and vertical scaling. Sharding adds major operational and correctness complexity.</div></details>
      <div class="sd-callout tip"><span class="sd-callout-l">Key takeaway</span>Partition within a DB; shard across DBs for horizontal scale. Choose a high-cardinality, co-locating shard key; consistent hashing eases resharding; cross-shard joins/txns are the hard part. Shard last.</div>
    </div></section>
  `

});

/* ════════════════════════════ RELIABILITY & SCALABILITY ════════════════════════════ */
Object.assign(window.SD_CONTENT, {

  "caching-patterns": `
    <section class="sd-block" data-sec="overview"><h2 class="sd-h2">1. Overview</h2><div class="sd-block-body">
      <p><strong>Caching</strong> stores frequently-accessed data in fast storage (memory/Redis) to cut latency and offload the database. The hard parts are choosing the right read/write pattern and handling <strong>invalidation</strong> ("there are only two hard things in CS…"). Used everywhere: Redis/Memcached, CDN, browser, application cache.</p>
    </div></section>
    <section class="sd-block" data-sec="patterns"><h2 class="sd-h2">2. The Patterns</h2><div class="sd-block-body">
      <table><thead><tr><th>Pattern</th><th>Read</th><th>Write</th><th>Notes</th></tr></thead><tbody>
        <tr><td><strong>Cache-aside</strong> (lazy)</td><td>App checks cache → miss → DB → populate</td><td>Write DB, invalidate cache</td><td>Most common; cache only what's read</td></tr>
        <tr><td><strong>Read-through</strong></td><td>Cache loads from DB on miss</td><td>—</td><td>Cache library owns loading (Caffeine/Redis)</td></tr>
        <tr><td><strong>Write-through</strong></td><td>—</td><td>Write cache + DB synchronously</td><td>Consistent, slower writes</td></tr>
        <tr><td><strong>Write-behind</strong></td><td>—</td><td>Write cache now, DB async later</td><td>Fast writes, risk data loss on crash</td></tr>
      </tbody></table>
      <pre class="mermaid">graph TD
  A[App] -->|1 get| C[(Cache)]
  C -->|miss| DB[(DB)]
  DB -->|2 load| A
  A -->|3 set| C</pre>
    </div></section>
    <section class="sd-block" data-sec="java"><h2 class="sd-h2">3. Spring Cache + Redis (cache-aside)</h2><div class="sd-block-body">
      <pre><code class="language-java">@Service
public class ProductService {
    @org.springframework.cache.annotation.Cacheable(value = "products", key = "#id")
    public Product getById(Long id) { return repo.findById(id).orElseThrow(); }  // cached on first read

    @org.springframework.cache.annotation.CachePut(value = "products", key = "#p.id")
    public Product update(Product p) { return repo.save(p); }                    // refresh cache

    @org.springframework.cache.annotation.CacheEvict(value = "products", key = "#id")
    public void delete(Long id) { repo.deleteById(id); }                         // invalidate
}</code></pre>
      <pre><code class="language-properties">spring.cache.type=redis
spring.data.redis.host=localhost
spring.cache.redis.time-to-live=600000      # TTL = bound staleness</code></pre>
    </div></section>
    <section class="sd-block" data-sec="problems"><h2 class="sd-h2">4. Cache Failure Modes</h2><div class="sd-block-body">
      <ul>
        <li><strong>Cache stampede / thundering herd:</strong> a hot key expires and thousands of requests hit the DB simultaneously. Fix: lock/single-flight on recompute, probabilistic early expiry, or stale-while-revalidate.</li>
        <li><strong>Cache penetration:</strong> queries for non-existent keys always miss → DB hammered. Fix: cache negatives (short TTL) or a Bloom filter.</li>
        <li><strong>Cache avalanche:</strong> many keys expire at once. Fix: jittered TTLs.</li>
        <li><strong>Staleness / inconsistency:</strong> cache and DB diverge. Fix: TTL + invalidate on write; accept eventual consistency.</li>
      </ul>
    </div></section>
    <section class="sd-block" data-sec="interview"><h2 class="sd-h2">5. Interview Q&amp;A</h2><div class="sd-block-body">
      <details class="sd-faq"><summary>Cache-aside vs write-through?</summary><div>Cache-aside lazily populates on read and invalidates on write (simple, only caches hot data, brief inconsistency window). Write-through writes cache+DB together (always consistent reads, slower writes, caches data that may never be read).</div></details>
      <details class="sd-faq"><summary>How do you prevent a cache stampede?</summary><div>Single-flight (one thread recomputes while others wait), a short distributed lock per key, randomized/early recompute before expiry, or serve stale while refreshing in background.</div></details>
      <details class="sd-faq"><summary>What is cache penetration and the fix?</summary><div>Repeated requests for keys that don't exist bypass the cache and hit the DB. Cache the "not found" with a short TTL, or front the cache with a Bloom filter.</div></details>
      <details class="sd-faq"><summary>How do you keep cache and DB consistent?</summary><div>You generally can't perfectly. Use TTLs + invalidate-on-write and accept eventual consistency; for stricter needs, write-through or event-driven invalidation.</div></details>
      <div class="sd-callout tip"><span class="sd-callout-l">Key takeaway</span>Cache-aside is the default. Bound staleness with TTL + invalidation. Defend against stampede (single-flight), penetration (negative cache/Bloom), avalanche (jittered TTL).</div>
    </div></section>
  `,

  "fault-tolerance": `
    <section class="sd-block" data-sec="overview"><h2 class="sd-h2">1. Overview</h2><div class="sd-block-body">
      <p><strong>Fault tolerance</strong> is a system's ability to keep functioning (possibly degraded) when components fail. In distributed systems failure is the norm, not the exception — so you design to <em>contain</em> and <em>recover</em> from failures rather than prevent them all.</p>
    </div></section>
    <section class="sd-block" data-sec="patterns"><h2 class="sd-h2">2. Core Patterns</h2><div class="sd-block-body">
      <ul>
        <li><strong>Redundancy / replication:</strong> no single point of failure; multiple instances across AZs.</li>
        <li><strong>Timeouts:</strong> never wait forever on a downstream call.</li>
        <li><strong>Retries with backoff + jitter:</strong> for transient failures (idempotent ops only).</li>
        <li><strong>Circuit breaker:</strong> stop calling a failing dependency (see <a href="#circuit-breaker">Circuit Breaker</a>).</li>
        <li><strong>Bulkhead:</strong> isolate resource pools so one failure doesn't sink everything.</li>
        <li><strong>Graceful degradation / fallback:</strong> serve cached/default data when a dependency is down.</li>
        <li><strong>Failover:</strong> promote a standby (DB replica, leader election).</li>
      </ul>
    </div></section>
    <section class="sd-block" data-sec="java"><h2 class="sd-h2">3. Timeout + retry + fallback (Resilience4j)</h2><div class="sd-block-body">
      <pre><code class="language-java">@Service
public class InventoryClient {
    @io.github.resilience4j.retry.annotation.Retry(name = "inventory", fallbackMethod = "fallback")
    @io.github.resilience4j.timelimiter.annotation.TimeLimiter(name = "inventory")
    @io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker(name = "inventory", fallbackMethod = "fallback")
    public java.util.concurrent.CompletableFuture&lt;Integer&gt; getStock(String sku) {
        return java.util.concurrent.CompletableFuture.supplyAsync(() -&gt; remote.stock(sku));
    }
    // fallback signature: same params + Throwable
    public java.util.concurrent.CompletableFuture&lt;Integer&gt; fallback(String sku, Throwable t) {
        return java.util.concurrent.CompletableFuture.completedFuture(0); // degrade: assume out of stock
    }
}</code></pre>
      <pre><code class="language-yaml">resilience4j:
  retry:
    instances:
      inventory: { maxAttempts: 3, waitDuration: 200ms, enableExponentialBackoff: true }
  timelimiter:
    instances:
      inventory: { timeoutDuration: 2s }</code></pre>
    </div></section>
    <section class="sd-block" data-sec="interview"><h2 class="sd-h2">4. Interview Q&amp;A</h2><div class="sd-block-body">
      <details class="sd-faq"><summary>Why add jitter to retries?</summary><div>Without jitter, many clients retry in lockstep after a failure, creating synchronized spikes (retry storms) that overwhelm the recovering service. Randomized backoff spreads the load.</div></details>
      <details class="sd-faq"><summary>When is retrying dangerous?</summary><div>For non-idempotent operations (e.g. "charge card") a retry can double-execute. Only retry idempotent ops, or use an idempotency key (see <a href="#idempotency">Idempotency</a>).</div></details>
      <details class="sd-faq"><summary>What is a bulkhead?</summary><div>Isolating resources (separate thread pools/connection pools per dependency) so a slow/failing dependency exhausts only its own pool, not the whole app — like watertight ship compartments.</div></details>
      <details class="sd-faq"><summary>Difference between fault tolerance and high availability?</summary><div>HA = minimizing downtime (redundancy, failover). Fault tolerance = continuing to operate correctly through faults (often degraded). They overlap; HA is a goal, fault-tolerance patterns are how you get there.</div></details>
      <div class="sd-callout tip"><span class="sd-callout-l">Key takeaway</span>Assume failure. Combine timeouts + backoff-retry (idempotent) + circuit breaker + bulkhead + graceful fallback + redundancy.</div>
    </div></section>
  `,

  "idempotency": `
    <section class="sd-block" data-sec="overview"><h2 class="sd-h2">1. Overview</h2><div class="sd-block-body">
      <p>An operation is <strong>idempotent</strong> if performing it multiple times has the same effect as performing it once. It's essential in distributed systems where retries, at-least-once messaging and webhook redeliveries mean the <em>same request can arrive twice</em>. Without idempotency you get double charges, duplicate orders, double-counted events.</p>
    </div></section>
    <section class="sd-block" data-sec="theory"><h2 class="sd-h2">2. HTTP semantics & the need</h2><div class="sd-block-body">
      <ul><li><code>GET</code>, <code>PUT</code>, <code>DELETE</code> are idempotent by definition; <code>POST</code> is not.</li><li>Networks fail <em>after</em> processing but <em>before</em> the response → client retries → duplicate. Idempotency makes the retry safe.</li></ul>
      <pre class="mermaid">sequenceDiagram
  participant C as Client
  participant S as Server
  C->>S: POST /payments (Idempotency-Key: abc)
  S->>S: process, store key→result
  S--xC: response lost (timeout)
  C->>S: retry POST (same key abc)
  S->>S: key seen → return stored result (no re-charge)
  S-->>C: 200 (same result)</pre>
    </div></section>
    <section class="sd-block" data-sec="java"><h2 class="sd-h2">3. Idempotency-Key implementation</h2><div class="sd-block-body">
      <pre><code class="language-java">@RestController
public class PaymentController {
    private final IdempotencyStore store;     // Redis/DB: key → status+response
    private final PaymentService payments;

    @PostMapping("/payments")
    public org.springframework.http.ResponseEntity&lt;PaymentResult&gt; pay(
            @RequestHeader("Idempotency-Key") String key,
            @RequestBody PaymentRequest req) {
        // 1) atomic "claim" the key — SET NX. If already present, return stored result.
        var existing = store.getOrClaim(key);
        if (existing.isPresent()) return org.springframework.http.ResponseEntity.ok(existing.get());
        // 2) process exactly once
        PaymentResult result = payments.charge(req);
        store.complete(key, result);          // persist result against the key (with TTL)
        return org.springframework.http.ResponseEntity.ok(result);
    }
}
// Database guarantee of last resort: a UNIQUE constraint on (idempotency_key)
// makes a duplicate insert fail atomically even under a race.</code></pre>
    </div></section>
    <section class="sd-block" data-sec="techniques"><h2 class="sd-h2">4. Techniques</h2><div class="sd-block-body">
      <ul>
        <li><strong>Idempotency key:</strong> client sends a unique key; server stores key→result and replays it on retry (Stripe model).</li>
        <li><strong>Natural idempotency:</strong> design operations as "set state to X" (PUT) rather than "increment".</li>
        <li><strong>Dedup table / unique constraint:</strong> DB rejects duplicates atomically.</li>
        <li><strong>Idempotent consumers:</strong> track processed message ids (Kafka/SQS at-least-once).</li>
      </ul>
    </div></section>
    <section class="sd-block" data-sec="interview"><h2 class="sd-h2">5. Interview Q&amp;A</h2><div class="sd-block-body">
      <details class="sd-faq"><summary>How do you make a payment API idempotent?</summary><div>Require an <code>Idempotency-Key</code> header; atomically claim it (Redis SET NX or a unique DB row); if already present, return the stored result instead of charging again. TTL the key.</div></details>
      <details class="sd-faq"><summary>Why is POST not idempotent and how to fix?</summary><div>POST creates a new resource each call. Add an idempotency key so the server recognizes and dedupes retries, or model the operation as an idempotent PUT.</div></details>
      <details class="sd-faq"><summary>Where does idempotency matter in messaging?</summary><div>Kafka/SQS deliver at-least-once, so consumers must dedupe by message id (idempotent consumer) to avoid double-processing.</div></details>
      <details class="sd-faq"><summary>What handles the race where two retries arrive together?</summary><div>The atomic claim (SET NX or a UNIQUE constraint) ensures exactly one wins; the other reads the stored/failed result. Never check-then-act non-atomically.</div></details>
      <div class="sd-callout tip"><span class="sd-callout-l">Key takeaway</span>Retries &amp; at-least-once delivery make duplicates inevitable. Use idempotency keys (atomic claim + stored result) and unique constraints so repeats are safe.</div>
    </div></section>
  `,

  "rate-limiting": `
    <section class="sd-block" data-sec="overview"><h2 class="sd-h2">1. Overview</h2><div class="sd-block-body">
      <p><strong>Rate limiting</strong> caps request volume per client/time-window to protect services from abuse, ensure fair use, and prevent overload-driven cascading failure. It's enforced at the edge (gateway) and sometimes per-service. (See also the LLD design: <a href="#rate-limiter-lld">Rate Limiter</a>.)</p>
    </div></section>
    <section class="sd-block" data-sec="algos"><h2 class="sd-h2">2. Algorithms (quick reference)</h2><div class="sd-block-body">
      <table><thead><tr><th>Algorithm</th><th>Bursts?</th><th>Accuracy</th><th>Cost</th></tr></thead><tbody>
        <tr><td><strong>Token bucket</strong></td><td>Yes (up to capacity)</td><td>Good</td><td>O(1), 2 numbers</td></tr>
        <tr><td>Leaky bucket</td><td>No (smooth output)</td><td>Good</td><td>Queue</td></tr>
        <tr><td>Fixed window</td><td>2× at edges</td><td>Low</td><td>O(1) counter</td></tr>
        <tr><td>Sliding window log</td><td>—</td><td>Exact</td><td>O(n) memory</td></tr>
        <tr><td>Sliding window counter</td><td>—</td><td>High (approx)</td><td>O(1)</td></tr>
      </tbody></table>
      <p>Token bucket is the usual default; sliding-window counter when you need accuracy without per-request memory.</p>
    </div></section>
    <section class="sd-block" data-sec="distributed"><h2 class="sd-h2">3. Distributed enforcement</h2><div class="sd-block-body">
      <p>Per-node counters over-admit by a factor of N nodes. Centralize counters in <strong>Redis</strong> with an atomic operation (<code>INCR</code> + <code>EXPIRE</code>, or a Lua token-bucket script) so the limit is global and race-free. Enforce at the API gateway.</p>
      <pre><code class="language-java">// Sliding-window-ish with Redis INCR + EXPIRE (fixed window per minute)
String key = "rl:" + clientId + ":" + (System.currentTimeMillis()/60000);
Long count = redis.opsForValue().increment(key);
if (count == 1) redis.expire(key, java.time.Duration.ofMinutes(1));
boolean allowed = count &lt;= LIMIT;   // 429 if not</code></pre>
    </div></section>
    <section class="sd-block" data-sec="best"><h2 class="sd-h2">4. Best Practices</h2><div class="sd-block-body">
      <ul><li>Return <code>429 Too Many Requests</code> + <code>Retry-After</code> + <code>X-RateLimit-Remaining/Reset</code>.</li><li>Tier limits per plan; separate limits per endpoint (expensive vs cheap).</li><li>Atomic distributed counters (Lua/INCR) — never read-modify-write.</li><li>Decide fail-open vs fail-closed if the limiter store is down.</li></ul>
    </div></section>
    <section class="sd-block" data-sec="interview"><h2 class="sd-h2">5. Interview Q&amp;A</h2><div class="sd-block-body">
      <details class="sd-faq"><summary>Why rate-limit at all?</summary><div>Protect against abuse/DDoS, ensure fair multi-tenant usage, control cost, and prevent an overload from cascading into failure across services.</div></details>
      <details class="sd-faq"><summary>Fixed window's flaw?</summary><div>Two bursts straddling the window boundary allow up to 2× the limit in a short span. Sliding window smooths this.</div></details>
      <details class="sd-faq"><summary>How do you enforce limits across many nodes?</summary><div>Centralize state in Redis with atomic operations (a Lua script for token bucket, or INCR+EXPIRE) so all nodes share one counter; enforce at the gateway.</div></details>
      <div class="sd-callout tip"><span class="sd-callout-l">Key takeaway</span>Token bucket / sliding window, enforced atomically in Redis at the gateway; return 429 + Retry-After; tier per plan.</div>
    </div></section>
  `,

  "circuit-breaker": `
    <section class="sd-block" data-sec="overview"><h2 class="sd-h2">1. Overview</h2><div class="sd-block-body">
      <p>The <strong>Circuit Breaker</strong> stops an application from repeatedly calling a failing dependency, giving it time to recover and failing fast instead of piling up blocked threads. Combined with <strong>Retry</strong> (transient errors) and <strong>Bulkhead</strong> (resource isolation), it prevents <em>cascading failures</em>.</p>
    </div></section>
    <section class="sd-block" data-sec="states"><h2 class="sd-h2">2. The three states</h2><div class="sd-block-body">
      <ul>
        <li><strong>CLOSED:</strong> calls flow normally; failures are counted.</li>
        <li><strong>OPEN:</strong> failure rate crossed the threshold → calls fail fast (fallback) without hitting the dependency, for a cool-down window.</li>
        <li><strong>HALF-OPEN:</strong> after the window, a few trial calls are allowed; success → CLOSED, failure → OPEN again.</li>
      </ul>
      <pre class="mermaid">stateDiagram-v2
  [*] --> CLOSED
  CLOSED --> OPEN: failure rate &gt; threshold
  OPEN --> HALF_OPEN: after wait duration
  HALF_OPEN --> CLOSED: trial calls succeed
  HALF_OPEN --> OPEN: trial calls fail</pre>
    </div></section>
    <section class="sd-block" data-sec="bulkhead"><h2 class="sd-h2">3. Bulkhead & Retry</h2><div class="sd-block-body">
      <ul>
        <li><strong>Bulkhead:</strong> dedicate a bounded thread/connection pool (or semaphore) per dependency, so one slow downstream can't exhaust all threads and take the whole service down.</li>
        <li><strong>Retry:</strong> re-attempt transient failures with exponential backoff + jitter — only for idempotent operations, and <em>inside</em> the breaker so retries don't keep a dead service busy.</li>
      </ul>
    </div></section>
    <section class="sd-block" data-sec="why"><h2 class="sd-h2">4. Why — cascading failure</h2><div class="sd-block-body">
      <p>Without a breaker: dependency D slows down → callers' threads block waiting on D → thread pools fill → the caller stops serving <em>all</em> requests → its callers block → failure cascades up the chain. The breaker cuts D off early and returns a fast fallback, containing the blast radius.</p>
    </div></section>
    <section class="sd-block" data-sec="interview"><h2 class="sd-h2">5. Interview Q&amp;A</h2><div class="sd-block-body">
      <details class="sd-faq"><summary>Walk through the breaker states.</summary><div>CLOSED (normal, counting failures) → OPEN when the failure rate exceeds the threshold (fail fast for a cool-down) → HALF-OPEN trial calls → back to CLOSED on success or OPEN on failure.</div></details>
      <details class="sd-faq"><summary>Circuit breaker vs retry — do they conflict?</summary><div>They complement: retry handles brief blips; the breaker handles sustained failure (and prevents retries from hammering a down service). Configure retries to count toward the breaker.</div></details>
      <details class="sd-faq"><summary>What problem does the bulkhead solve?</summary><div>Resource isolation: a per-dependency pool means a misbehaving dependency exhausts only its own slice, not the entire service's threads/connections.</div></details>
      <details class="sd-faq"><summary>How does it prevent cascading failure?</summary><div>By failing fast (no blocked threads on the dead dependency) and returning a fallback, so the caller stays responsive and back-pressure doesn't propagate upstream.</div></details>
      <div class="sd-callout tip"><span class="sd-callout-l">Key takeaway</span>Circuit breaker (fail fast on sustained failure) + retry (transient blips) + bulkhead (isolation) + fallback = no cascading failures.</div>
    </div></section>
  `,

  "resilience4j": `
    <section class="sd-block" data-sec="overview"><h2 class="sd-h2">1. Overview</h2><div class="sd-block-body">
      <p><strong>Resilience4j</strong> is the lightweight, functional fault-tolerance library for Java (the modern replacement for Netflix Hystrix). It provides composable modules — CircuitBreaker, Retry, RateLimiter, Bulkhead, TimeLimiter — as decorators/annotations, integrated with Spring Boot and Micrometer.</p>
    </div></section>
    <section class="sd-block" data-sec="modules"><h2 class="sd-h2">2. Modules</h2><div class="sd-block-body">
      <table><thead><tr><th>Module</th><th>Protects against</th></tr></thead><tbody>
        <tr><td>CircuitBreaker</td><td>Calling a failing dependency</td></tr>
        <tr><td>Retry</td><td>Transient failures</td></tr>
        <tr><td>RateLimiter</td><td>Overuse of a resource</td></tr>
        <tr><td>Bulkhead</td><td>Resource exhaustion (concurrent calls)</td></tr>
        <tr><td>TimeLimiter</td><td>Slow calls (timeouts)</td></tr>
      </tbody></table>
    </div></section>
    <section class="sd-block" data-sec="java"><h2 class="sd-h2">3. Spring Boot config & usage</h2><div class="sd-block-body">
      <pre><code class="language-yaml">resilience4j:
  circuitbreaker:
    instances:
      paymentApi:
        sliding-window-type: COUNT_BASED
        sliding-window-size: 20
        failure-rate-threshold: 50          # open at 50% failures
        wait-duration-in-open-state: 10s
        permitted-number-of-calls-in-half-open-state: 3
  retry:
    instances:
      paymentApi: { max-attempts: 3, wait-duration: 200ms, enable-exponential-backoff: true }
  bulkhead:
    instances:
      paymentApi: { max-concurrent-calls: 20 }</code></pre>
      <pre><code class="language-java">@Service
public class PaymentGatewayClient {
    @io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker(name = "paymentApi", fallbackMethod = "fallback")
    @io.github.resilience4j.retry.annotation.Retry(name = "paymentApi")
    @io.github.resilience4j.bulkhead.annotation.Bulkhead(name = "paymentApi")
    public PaymentResult charge(PaymentRequest req) { return restClient.post(req); }

    private PaymentResult fallback(PaymentRequest req, io.github.resilience4j.circuitbreaker.CallNotPermittedException e) {
        return PaymentResult.queuedForLater(req);   // breaker OPEN → degrade gracefully
    }
    private PaymentResult fallback(PaymentRequest req, Throwable t) {
        return PaymentResult.failed("gateway unavailable");
    }
}</code></pre>
      <div class="sd-callout info"><span class="sd-callout-l">Order matters</span>Decorator order (outer→inner): Retry( CircuitBreaker( RateLimiter( TimeLimiter( Bulkhead( call ))))). With annotations Resilience4j applies a sensible default aspect order; verify for your version.</div>
    </div></section>
    <section class="sd-block" data-sec="interview"><h2 class="sd-h2">4. Interview Q&amp;A</h2><div class="sd-block-body">
      <details class="sd-faq"><summary>Resilience4j vs Hystrix?</summary><div>Hystrix is in maintenance mode (thread-pool heavy, bundled). Resilience4j is lightweight, modular, functional (decorators), Java 8+, and integrates with Micrometer — the recommended choice today.</div></details>
      <details class="sd-faq"><summary>COUNT_BASED vs TIME_BASED sliding window?</summary><div>COUNT_BASED evaluates the last N calls; TIME_BASED evaluates calls in the last N seconds. Time-based suits low/variable traffic; count-based suits steady traffic.</div></details>
      <details class="sd-faq"><summary>How do you observe breaker state?</summary><div>Resilience4j publishes events + Micrometer metrics (<code>resilience4j_circuitbreaker_state</code>, failure rate) → Prometheus/Grafana dashboards and alerts when a breaker opens.</div></details>
      <div class="sd-callout tip"><span class="sd-callout-l">Key takeaway</span>Resilience4j = composable CircuitBreaker/Retry/RateLimiter/Bulkhead/TimeLimiter via annotations + config, with fallbacks and Micrometer metrics.</div>
    </div></section>
  `,

  "distributed-locks": `
    <section class="sd-block" data-sec="overview"><h2 class="sd-h2">1. Overview</h2><div class="sd-block-body">
      <p>A <strong>distributed lock</strong> provides mutual exclusion <em>across</em> processes/nodes (a single-JVM <code>synchronized</code> can't help when there are many instances). Used to ensure only one node runs a scheduled job, processes a resource, or performs a critical update at a time.</p>
    </div></section>
    <section class="sd-block" data-sec="redis"><h2 class="sd-h2">2. Redis lock — SET NX PX</h2><div class="sd-block-body">
      <p>The basic primitive: <code>SET lockKey uniqueToken NX PX 30000</code> — set only if absent (NX) with an expiry (PX) so a crashed holder doesn't deadlock forever. Release only if you still own it (check the token), atomically via Lua.</p>
      <pre><code class="language-java">public class RedisLock {
    private final org.springframework.data.redis.core.StringRedisTemplate redis;
    public RedisLock(org.springframework.data.redis.core.StringRedisTemplate r){ this.redis = r; }

    public String acquire(String key, java.time.Duration ttl) {
        String token = java.util.UUID.randomUUID().toString();
        Boolean ok = redis.opsForValue().setIfAbsent(key, token, ttl);   // SET NX PX
        return Boolean.TRUE.equals(ok) ? token : null;
    }
    private static final String UNLOCK =
        "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end";
    public boolean release(String key, String token) {                   // atomic compare-and-delete
        Long r = redis.execute(new org.springframework.data.redis.core.script.DefaultRedisScript&lt;&gt;(UNLOCK, Long.class),
                               java.util.List.of(key), token);
        return Long.valueOf(1).equals(r);
    }
}</code></pre>
      <div class="sd-callout warn"><span class="sd-callout-l">Trap</span>Releasing without checking the token can delete <em>someone else's</em> lock (yours expired, another node acquired it, then you DEL it). Always compare-and-delete atomically (Lua). For correctness-critical locks, <strong>Redlock</strong> (multiple Redis nodes) or fencing tokens are recommended — though even Redlock has debated edge cases under clock skew/GC pauses.</div>
    </div></section>
    <section class="sd-block" data-sec="alternatives"><h2 class="sd-h2">3. Alternatives & Fencing</h2><div class="sd-block-body">
      <table><thead><tr><th>Mechanism</th><th>Notes</th></tr></thead><tbody>
        <tr><td><strong>Redis SET NX</strong></td><td>Fast, simple; not perfectly safe under pauses/skew</td></tr>
        <tr><td><strong>Redisson</strong></td><td>Battle-tested Java client: lock with watchdog auto-renew, fair/read-write locks</td></tr>
        <tr><td><strong>ZooKeeper / etcd</strong></td><td>Ephemeral znodes / leases; strong consistency; leader election</td></tr>
        <tr><td><strong>DB lock</strong></td><td><code>SELECT … FOR UPDATE</code> / advisory locks — simple if you already have the DB</td></tr>
      </tbody></table>
      <p><strong>Fencing token:</strong> the lock service hands out a monotonically increasing token; the protected resource rejects writes with a stale token — protects against a paused holder waking up after its lease expired.</p>
    </div></section>
    <section class="sd-block" data-sec="interview"><h2 class="sd-h2">4. Interview Q&amp;A</h2><div class="sd-block-body">
      <details class="sd-faq"><summary>Why can't you use <code>synchronized</code>?</summary><div>It only coordinates threads within one JVM. With multiple service instances, you need a lock in shared infrastructure (Redis/ZooKeeper/DB) that all nodes consult.</div></details>
      <details class="sd-faq"><summary>Why a TTL on the lock?</summary><div>So a crashed/partitioned holder doesn't hold the lock forever (deadlock). The expiry auto-releases it — but that introduces the risk a slow holder loses the lock mid-work (hence fencing tokens / watchdog renewal).</div></details>
      <details class="sd-faq"><summary>What is a fencing token and why?</summary><div>A monotonically increasing number issued with the lock; the resource only accepts the highest token seen, so a delayed/expired holder's late write is rejected — closing the GC-pause/clock-skew safety gap.</div></details>
      <details class="sd-faq"><summary>Redis lock vs ZooKeeper lock?</summary><div>Redis is faster and simpler but eventually-consistent (weaker safety). ZooKeeper/etcd provide strong consistency and built-in leader election/ephemeral nodes — better when correctness &gt; latency.</div></details>
      <div class="sd-callout tip"><span class="sd-callout-l">Key takeaway</span>Cross-node mutual exclusion via Redis SET NX PX (compare-and-delete release) or Redisson/ZooKeeper. Always TTL; use fencing tokens for correctness-critical locks.</div>
    </div></section>
  `

});

/* ════════════════════════════ SOLID PRINCIPLES ════════════════════════════ */
Object.assign(window.SD_CONTENT, {

  "single-responsibility": `
    <section class="sd-block" data-sec="overview"><h2 class="sd-h2">1. Overview (S)</h2><div class="sd-block-body">
      <p><strong>Single Responsibility Principle:</strong> a class should have <em>one reason to change</em> — one responsibility / one actor it serves. Mixing concerns (business logic + persistence + formatting) creates fragile "god classes" where a change for one reason breaks another.</p>
    </div></section>
    <section class="sd-block" data-sec="example"><h2 class="sd-h2">2. Violation → Fix</h2><div class="sd-block-body">
      <pre><code class="language-java">// VIOLATION: three reasons to change in one class
class UserService {
    void register(User u){ /* validation */ /* save to DB */ /* send email */ /* generate PDF */ }
}
// FIX: separate responsibilities, compose them
class UserValidator { void validate(User u){ } }
class UserRepository { void save(User u){ } }
class EmailService { void sendWelcome(User u){ } }
class UserRegistrationService {              // orchestrates collaborators
    private final UserValidator validator; private final UserRepository repo; private final EmailService email;
    UserRegistrationService(UserValidator v, UserRepository r, EmailService e){ validator=v; repo=r; email=e; }
    void register(User u){ validator.validate(u); repo.save(u); email.sendWelcome(u); }
}</code></pre>
    </div></section>
    <section class="sd-block" data-sec="interview"><h2 class="sd-h2">3. Interview Q&amp;A</h2><div class="sd-block-body">
      <details class="sd-faq"><summary>How do you identify an SRP violation?</summary><div>If you describe the class with "and" (validates <em>and</em> persists <em>and</em> emails), or different teams/actors request changes to the same class, it has multiple responsibilities. Split by reason-to-change.</div></details>
      <details class="sd-faq"><summary>Can SRP be taken too far?</summary><div>Yes — over-splitting into anemic one-method classes adds indirection and cognitive load. Group by cohesive responsibility/actor, not by counting methods.</div></details>
      <div class="sd-callout tip"><span class="sd-callout-l">Key takeaway</span>One class, one reason to change. Separate validation, persistence, presentation, notification; orchestrate via a service.</div>
    </div></section>
  `,

  "open-closed": `
    <section class="sd-block" data-sec="overview"><h2 class="sd-h2">1. Overview (O)</h2><div class="sd-block-body">
      <p><strong>Open/Closed Principle:</strong> software entities should be <em>open for extension, closed for modification</em>. Add new behaviour by adding new code (new subclass/strategy/implementation), not by editing existing, tested code — which reduces regression risk.</p>
    </div></section>
    <section class="sd-block" data-sec="example"><h2 class="sd-h2">2. Violation → Fix</h2><div class="sd-block-body">
      <pre><code class="language-java">// VIOLATION: every new payment type edits this method (and its tests)
class PaymentProcessor {
    void pay(String type, double amt){
        if (type.equals("CARD")) { /*...*/ }
        else if (type.equals("UPI")) { /*...*/ }
        // add "CRYPTO" → modify here again
    }
}
// FIX: polymorphism / Strategy — extend without modifying
interface PaymentMethod { void pay(double amount); }
class CardPayment   implements PaymentMethod { public void pay(double a){ } }
class UpiPayment    implements PaymentMethod { public void pay(double a){ } }
class CryptoPayment implements PaymentMethod { public void pay(double a){ } }  // NEW: just add a class
class PaymentProcessor2 {
    void process(PaymentMethod method, double amt){ method.pay(amt); }   // never changes
}</code></pre>
    </div></section>
    <section class="sd-block" data-sec="interview"><h2 class="sd-h2">3. Interview Q&amp;A</h2><div class="sd-block-body">
      <details class="sd-faq"><summary>How is OCP achieved in practice?</summary><div>Through abstraction + polymorphism: depend on an interface and add new implementations (Strategy/Factory/template), so new requirements add code rather than editing existing branches.</div></details>
      <details class="sd-faq"><summary>Sign you're violating OCP?</summary><div>Growing if/else or switch on a type, edited every time a new variant appears. Replace with polymorphic dispatch.</div></details>
      <div class="sd-callout tip"><span class="sd-callout-l">Key takeaway</span>Extend via new classes behind an interface; stop editing tested code. Long type-switches are the smell.</div>
    </div></section>
  `,

  "liskov-substitution": `
    <section class="sd-block" data-sec="overview"><h2 class="sd-h2">1. Overview (L)</h2><div class="sd-block-body">
      <p><strong>Liskov Substitution Principle:</strong> subtypes must be substitutable for their base type without breaking correctness. A subclass shouldn't strengthen preconditions, weaken postconditions, or violate the base contract — otherwise polymorphism becomes a trap.</p>
    </div></section>
    <section class="sd-block" data-sec="example"><h2 class="sd-h2">2. The classic violation</h2><div class="sd-block-body">
      <pre><code class="language-java">// VIOLATION: Square "is-a" Rectangle breaks the contract
class Rectangle { protected int w,h; void setW(int w){this.w=w;} void setH(int h){this.h=h;} int area(){return w*h;} }
class Square extends Rectangle {
    void setW(int w){ this.w=w; this.h=w; }   // side effect breaks caller expectations
    void setH(int h){ this.w=h; this.h=h; }
}
// Caller: setW(5); setH(4); expects area 20 — but a Square gives 16. Substitution broke logic.
// FIX: don't force an is-a that violates behaviour. Model Shape with area(); compose instead of inherit.
interface Shape { int area(); }
record Rect(int w,int h) implements Shape { public int area(){ return w*h; } }
record Sq(int side)     implements Shape { public int area(){ return side*side; } }</code></pre>
    </div></section>
    <section class="sd-block" data-sec="interview"><h2 class="sd-h2">3. Interview Q&amp;A</h2><div class="sd-block-body">
      <details class="sd-faq"><summary>Give a real LSP violation.</summary><div>Square extends Rectangle (independent width/height assumption broken); or an <code>UnsupportedOperationException</code> in an overridden method (e.g. immutable list extending a mutable list interface) — callers relying on the base contract break.</div></details>
      <details class="sd-faq"><summary>Rules a subtype must follow?</summary><div>Preconditions no stronger, postconditions no weaker, invariants preserved, no new exceptions the base doesn't declare, and behaviour consistent with the base's contract.</div></details>
      <div class="sd-callout tip"><span class="sd-callout-l">Key takeaway</span>Subtypes must honour the base contract so they're drop-in replacements. Favor composition / proper abstractions over forced is-a hierarchies.</div>
    </div></section>
  `,

  "interface-segregation": `
    <section class="sd-block" data-sec="overview"><h2 class="sd-h2">1. Overview (I)</h2><div class="sd-block-body">
      <p><strong>Interface Segregation Principle:</strong> clients shouldn't be forced to depend on methods they don't use. Prefer several small, role-specific interfaces over one fat interface — so implementers aren't burdened with irrelevant methods (often "thrown" as <code>UnsupportedOperationException</code>).</p>
    </div></section>
    <section class="sd-block" data-sec="example"><h2 class="sd-h2">2. Violation → Fix</h2><div class="sd-block-body">
      <pre><code class="language-java">// VIOLATION: a fat interface forces robots to implement eat()/sleep()
interface Worker { void work(); void eat(); void sleep(); }
class Robot implements Worker {
    public void work(){ } public void eat(){ throw new UnsupportedOperationException(); } // smell!
    public void sleep(){ throw new UnsupportedOperationException(); }
}
// FIX: segregate by role
interface Workable { void work(); }
interface Eatable  { void eat(); }
class Human implements Workable, Eatable { public void work(){ } public void eat(){ } }
class Robot2 implements Workable { public void work(){ } }   // only what it needs</code></pre>
    </div></section>
    <section class="sd-block" data-sec="interview"><h2 class="sd-h2">3. Interview Q&amp;A</h2><div class="sd-block-body">
      <details class="sd-faq"><summary>How does ISP relate to SRP?</summary><div>SRP is about cohesive classes; ISP is the same idea for interfaces — keep them focused on one role so implementers/clients depend only on what's relevant.</div></details>
      <details class="sd-faq"><summary>Symptom of an ISP violation?</summary><div>Implementations throwing <code>UnsupportedOperationException</code> or leaving methods empty because the interface is too broad.</div></details>
      <div class="sd-callout tip"><span class="sd-callout-l">Key takeaway</span>Many small role interfaces beat one fat interface. No empty/unsupported method stubs.</div>
    </div></section>
  `,

  "dependency-inversion": `
    <section class="sd-block" data-sec="overview"><h2 class="sd-h2">1. Overview (D)</h2><div class="sd-block-body">
      <p><strong>Dependency Inversion Principle:</strong> high-level modules shouldn't depend on low-level modules — both should depend on <em>abstractions</em>. And abstractions shouldn't depend on details; details depend on abstractions. This is what makes code testable and swappable, and underpins Spring's IoC/DI.</p>
    </div></section>
    <section class="sd-block" data-sec="example"><h2 class="sd-h2">2. Violation → Fix (DI)</h2><div class="sd-block-body">
      <pre><code class="language-java">// VIOLATION: service hard-wires a concrete dependency (can't swap/test)
class NotificationService { private final EmailSender sender = new EmailSender(); /* new = coupling */ }

// FIX: depend on an abstraction; inject the implementation
interface MessageSender { void send(String to, String msg); }
class EmailSender implements MessageSender { public void send(String to, String m){ } }
class SmsSender   implements MessageSender { public void send(String to, String m){ } }

@org.springframework.stereotype.Service
class NotificationService2 {
    private final MessageSender sender;                 // abstraction
    NotificationService2(MessageSender sender){ this.sender = sender; }   // constructor injection
    void notify(String to, String msg){ sender.send(to, msg); }
}
// Spring injects EmailSender or SmsSender; tests inject a mock — no code change.</code></pre>
    </div></section>
    <section class="sd-block" data-sec="interview"><h2 class="sd-h2">3. Interview Q&amp;A</h2><div class="sd-block-body">
      <details class="sd-faq"><summary>DIP vs Dependency Injection vs IoC?</summary><div>DIP is the <em>principle</em> (depend on abstractions). IoC is the <em>idea</em> of handing control of object creation to a container. DI is the <em>technique</em> (constructor/setter injection) the container uses to fulfil DIP.</div></details>
      <details class="sd-faq"><summary>Why constructor injection over field injection?</summary><div>Constructor injection makes dependencies explicit and final, enables immutability, fails fast if missing, and is trivially testable without reflection — field injection hides dependencies and needs the container to instantiate.</div></details>
      <details class="sd-faq"><summary>How does DIP enable testing?</summary><div>Because the class depends on an interface, tests inject mocks/stubs instead of real DB/HTTP collaborators.</div></details>
      <div class="sd-callout tip"><span class="sd-callout-l">Key takeaway</span>Depend on interfaces, inject implementations (constructor injection). This is the backbone of Spring DI and testable design.</div>
    </div></section>
  `,

  "class-relationships": `
    <section class="sd-block" data-sec="overview"><h2 class="sd-h2">1. Overview</h2><div class="sd-block-body">
      <p>Object-oriented design composes classes through relationships. Knowing the precise difference between <strong>association, aggregation, composition, inheritance and dependency</strong> — and "favour composition over inheritance" — is foundational for LLD interviews and reading UML.</p>
    </div></section>
    <section class="sd-block" data-sec="types"><h2 class="sd-h2">2. The relationships</h2><div class="sd-block-body">
      <table><thead><tr><th>Relationship</th><th>Meaning</th><th>Lifetime</th><th>UML</th></tr></thead><tbody>
        <tr><td><strong>Association</strong></td><td>"uses-a" / knows about</td><td>Independent</td><td>plain line</td></tr>
        <tr><td><strong>Aggregation</strong></td><td>"has-a", shared ownership</td><td>Part can outlive whole</td><td>hollow diamond</td></tr>
        <tr><td><strong>Composition</strong></td><td>"owns-a", exclusive</td><td>Part dies with whole</td><td>filled diamond</td></tr>
        <tr><td><strong>Inheritance</strong></td><td>"is-a"</td><td>—</td><td>hollow triangle</td></tr>
        <tr><td><strong>Dependency</strong></td><td>transient use (param/return)</td><td>Momentary</td><td>dashed arrow</td></tr>
      </tbody></table>
      <pre class="mermaid">classDiagram
  Car *-- Engine : composition (owns)
  Team o-- Player : aggregation (shares)
  Dog --|> Animal : inheritance (is-a)
  Order ..> PricingService : dependency (uses)</pre>
    </div></section>
    <section class="sd-block" data-sec="example"><h2 class="sd-h2">3. Composition over inheritance</h2><div class="sd-block-body">
      <pre><code class="language-java">// Composition: Car OWNS its Engine (created/destroyed together)
class Engine { }
class Car {
    private final Engine engine = new Engine();    // composition — part of the car
}
// Aggregation: Team HAS players, but players exist independently
class Player { }
class Team {
    private final java.util.List&lt;Player&gt; players;   // aggregation — passed in, shared
    Team(java.util.List&lt;Player&gt; players){ this.players = players; }
}
// Prefer composition: a "Robot logger" composes a Logger rather than extending it,
// avoiding fragile base-class coupling and enabling runtime swapping (Strategy/Decorator).</code></pre>
    </div></section>
    <section class="sd-block" data-sec="interview"><h2 class="sd-h2">4. Interview Q&amp;A</h2><div class="sd-block-body">
      <details class="sd-faq"><summary>Aggregation vs Composition?</summary><div>Both are "has-a", but composition is exclusive ownership with shared lifetime (Car–Engine; destroy the car, destroy the engine), while aggregation is shared/independent lifetime (Team–Player; disband the team, players remain).</div></details>
      <details class="sd-faq"><summary>Why favour composition over inheritance?</summary><div>Inheritance couples you to a base class's implementation (fragile base class), allows only one parent, and is fixed at compile time. Composition is flexible, swappable at runtime, and avoids deep brittle hierarchies — and supports LSP/OCP.</div></details>
      <details class="sd-faq"><summary>Association vs Dependency?</summary><div>Association is a lasting structural link (a field referencing another object); dependency is transient use (a parameter or return type) without holding a reference.</div></details>
      <div class="sd-callout tip"><span class="sd-callout-l">Key takeaway</span>Composition (owns, filled diamond) vs aggregation (shares, hollow) vs inheritance (is-a) vs dependency (uses). Favour composition for flexibility.</div>
    </div></section>
  `

});

/* ════════════════════════════ CREATIONAL PATTERNS ════════════════════════════ */
Object.assign(window.SD_CONTENT, {

  "builder": `
    <section class="sd-block" data-sec="overview"><h2 class="sd-h2">1. Overview</h2><div class="sd-block-body">
      <p>The <strong>Builder</strong> pattern constructs complex objects step-by-step, separating construction from representation. It solves the <em>telescoping constructor</em> problem (many overloaded constructors) and produces readable, immutable objects with optional parameters.</p>
    </div></section>
    <section class="sd-block" data-sec="java"><h2 class="sd-h2">2. Implementation</h2><div class="sd-block-body">
      <pre><code class="language-java">public final class HttpRequest {
    private final String url;            // required
    private final String method;         // optional, default GET
    private final java.util.Map&lt;String,String&gt; headers;
    private final String body;

    private HttpRequest(Builder b){ this.url=b.url; this.method=b.method; this.headers=b.headers; this.body=b.body; }

    public static Builder builder(String url){ return new Builder(url); }
    public static final class Builder {
        private final String url; private String method = "GET";
        private final java.util.Map&lt;String,String&gt; headers = new java.util.HashMap&lt;&gt;(); private String body;
        private Builder(String url){ this.url = java.util.Objects.requireNonNull(url); }
        public Builder method(String m){ this.method = m; return this; }       // fluent
        public Builder header(String k,String v){ headers.put(k,v); return this; }
        public Builder body(String b){ this.body = b; return this; }
        public HttpRequest build(){
            if (body != null &amp;&amp; method.equals("GET")) throw new IllegalStateException("GET cannot have a body");
            return new HttpRequest(this);                                       // validate then construct
        }
    }
}
// Usage — readable, only set what you need:
HttpRequest req = HttpRequest.builder("https://api.x.com")
    .method("POST").header("Authorization","Bearer t").body("{}").build();</code></pre>
      <p><strong>Lombok shortcut:</strong> annotate the class with <code>@Builder</code> (and <code>@Value</code> for immutability) to generate all of this.</p>
    </div></section>
    <section class="sd-block" data-sec="interview"><h2 class="sd-h2">3. Interview Q&amp;A</h2><div class="sd-block-body">
      <details class="sd-faq"><summary>When use Builder over a constructor?</summary><div>When there are many parameters (especially optional ones), you want immutability + readability, or construction needs validation across fields. It avoids telescoping constructors and confusing positional args.</div></details>
      <details class="sd-faq"><summary>Builder vs Factory?</summary><div>Factory decides <em>which</em> object/subtype to create (one step). Builder assembles <em>one complex</em> object step-by-step. They're complementary.</div></details>
      <div class="sd-callout tip"><span class="sd-callout-l">Key takeaway</span>Builder = fluent, validated, immutable construction for objects with many/optional fields. Use Lombok <code>@Builder</code> in practice.</div>
    </div></section>
  `,

  "factory-method": `
    <section class="sd-block" data-sec="overview"><h2 class="sd-h2">1. Overview</h2><div class="sd-block-body">
      <p>The <strong>Factory Method</strong> defines an interface for creating an object but lets the caller/subclass decide which concrete class to instantiate. It centralizes object creation, decouples clients from concrete types, and supports the Open/Closed principle (add a new type without editing callers).</p>
    </div></section>
    <section class="sd-block" data-sec="java"><h2 class="sd-h2">2. Implementation</h2><div class="sd-block-body">
      <pre><code class="language-java">interface Notification { void send(String msg); }
class EmailNotification implements Notification { public void send(String m){ } }
class SmsNotification   implements Notification { public void send(String m){ } }
class PushNotification  implements Notification { public void send(String m){ } }

// Simple factory (a static creator)
class NotificationFactory {
    static Notification create(String channel){
        return switch (channel) {
            case "EMAIL" -&gt; new EmailNotification();
            case "SMS"   -&gt; new SmsNotification();
            case "PUSH"  -&gt; new PushNotification();
            default -&gt; throw new IllegalArgumentException("Unknown channel " + channel);
        };
    }
}
// Client depends only on the interface + factory, not concretes:
Notification n = NotificationFactory.create("EMAIL");  n.send("hi");</code></pre>
      <p><strong>Spring angle:</strong> inject a <code>Map&lt;String, Notification&gt;</code> (bean name → bean) and select by key — a registry-style factory with no switch.</p>
    </div></section>
    <section class="sd-block" data-sec="interview"><h2 class="sd-h2">3. Interview Q&amp;A</h2><div class="sd-block-body">
      <details class="sd-faq"><summary>Factory Method vs Abstract Factory?</summary><div>Factory Method creates one product via a single method (subclass/param decides the type). Abstract Factory creates <em>families</em> of related products through multiple factory methods grouped behind one interface.</div></details>
      <details class="sd-faq"><summary>How does it support OCP?</summary><div>Clients depend on the product interface + factory; adding a new product type means adding a class (and a case/bean), not editing every call site.</div></details>
      <div class="sd-callout tip"><span class="sd-callout-l">Key takeaway</span>Factory centralizes "which concrete to create", decoupling clients from concretes. In Spring, a bean map beats a switch.</div>
    </div></section>
  `,

  "singleton": `
    <section class="sd-block" data-sec="overview"><h2 class="sd-h2">1. Overview</h2><div class="sd-block-body">
      <p>The <strong>Singleton</strong> ensures a class has exactly one instance with a global access point — for shared, stateless resources (config, registry, connection pool, logger). Easy to get wrong in concurrent code; in Spring, beans are singletons by default so you rarely hand-roll it.</p>
    </div></section>
    <section class="sd-block" data-sec="java"><h2 class="sd-h2">2. Correct implementations</h2><div class="sd-block-body">
      <h4>Enum singleton (best — thread-safe, serialization-safe, reflection-safe)</h4>
      <pre><code class="language-java">public enum AppConfig {
    INSTANCE;
    private final java.util.Properties props = load();
    public String get(String key){ return props.getProperty(key); }
    private java.util.Properties load(){ return new java.util.Properties(); }
}
// AppConfig.INSTANCE.get("x");</code></pre>
      <h4>Bill Pugh (lazy via holder class — no synchronization cost)</h4>
      <pre><code class="language-java">public class Database {
    private Database(){ }
    private static class Holder { static final Database INSTANCE = new Database(); }  // loaded on first use
    public static Database getInstance(){ return Holder.INSTANCE; }                    // JVM guarantees safety
}</code></pre>
      <h4>Double-checked locking (needs volatile — see <a href="#volatile-keyword">volatile</a>)</h4>
      <pre><code class="language-java">public class Cache {
    private static volatile Cache instance;          // volatile is mandatory
    private Cache(){ }
    public static Cache getInstance(){
        if (instance == null) synchronized (Cache.class) { if (instance == null) instance = new Cache(); }
        return instance;
    }
}</code></pre>
    </div></section>
    <section class="sd-block" data-sec="interview"><h2 class="sd-h2">3. Interview Q&amp;A</h2><div class="sd-block-body">
      <details class="sd-faq"><summary>Best way to implement a singleton?</summary><div>Enum (Joshua Bloch's recommendation): inherently thread-safe, handles serialization, and resists reflection attacks. For lazy init, the Bill Pugh holder idiom is clean and lock-free.</div></details>
      <details class="sd-faq"><summary>Why is naive lazy singleton broken in multithreading?</summary><div>Two threads can both see <code>instance == null</code> and create two instances. Fix with eager init, the holder idiom, or double-checked locking with <code>volatile</code>.</div></details>
      <details class="sd-faq"><summary>Why is Singleton sometimes an anti-pattern?</summary><div>Global mutable state hurts testability (hidden dependency), couples code, and complicates concurrency. Prefer DI-managed singletons (Spring beans) so you can inject mocks.</div></details>
      <details class="sd-faq"><summary>Are Spring beans singletons?</summary><div>Yes by default (one instance per container), but that's a container scope, not the GoF pattern — and they're injected (testable), avoiding global static access.</div></details>
      <div class="sd-callout tip"><span class="sd-callout-l">Key takeaway</span>Prefer enum or Bill Pugh holder; DCL needs volatile. In Spring, use singleton-scoped beans (DI) instead of static singletons.</div>
    </div></section>
  `,

  "abstract-factory": `
    <section class="sd-block" data-sec="overview"><h2 class="sd-h2">1. Overview</h2><div class="sd-block-body">
      <p>The <strong>Abstract Factory</strong> provides an interface for creating <em>families of related objects</em> without specifying their concrete classes — guaranteeing the products are compatible (e.g. all "dark theme" UI widgets, or all "MySQL" DAO objects).</p>
    </div></section>
    <section class="sd-block" data-sec="java"><h2 class="sd-h2">2. Implementation</h2><div class="sd-block-body">
      <pre><code class="language-java">// Products
interface Button { void render(); }
interface Checkbox { void render(); }
class DarkButton implements Button { public void render(){ } }
class DarkCheckbox implements Checkbox { public void render(){ } }
class LightButton implements Button { public void render(){ } }
class LightCheckbox implements Checkbox { public void render(){ } }

// Abstract factory — creates a consistent family
interface UIFactory { Button createButton(); Checkbox createCheckbox(); }
class DarkUIFactory  implements UIFactory { public Button createButton(){return new DarkButton();}  public Checkbox createCheckbox(){return new DarkCheckbox();} }
class LightUIFactory implements UIFactory { public Button createButton(){return new LightButton();} public Checkbox createCheckbox(){return new LightCheckbox();} }

// Client uses one factory → guaranteed-consistent widgets
class App {
    private final Button button; private final Checkbox checkbox;
    App(UIFactory f){ this.button=f.createButton(); this.checkbox=f.createCheckbox(); }
}</code></pre>
    </div></section>
    <section class="sd-block" data-sec="interview"><h2 class="sd-h2">3. Interview Q&amp;A</h2><div class="sd-block-body">
      <details class="sd-faq"><summary>Abstract Factory vs Factory Method?</summary><div>Factory Method = one product, one creation method. Abstract Factory = a family of related products via several methods on one factory interface, ensuring they're mutually compatible.</div></details>
      <details class="sd-faq"><summary>Real-world example?</summary><div>JDBC-style driver factories, cross-platform UI toolkits, or a <code>StorageFactory</code> producing matching <code>FileStore</code> + <code>MetaStore</code> for S3 vs local.</div></details>
      <div class="sd-callout tip"><span class="sd-callout-l">Key takeaway</span>Abstract Factory builds consistent families of products behind one interface, swappable as a unit.</div>
    </div></section>
  `,

  "prototype": `
    <section class="sd-block" data-sec="overview"><h2 class="sd-h2">1. Overview</h2><div class="sd-block-body">
      <p>The <strong>Prototype</strong> pattern creates new objects by <em>cloning</em> an existing instance rather than constructing from scratch — useful when construction is expensive (deep config, DB load) or when you need many similar objects.</p>
    </div></section>
    <section class="sd-block" data-sec="java"><h2 class="sd-h2">2. Implementation — shallow vs deep copy</h2><div class="sd-block-body">
      <pre><code class="language-java">public class Document implements Cloneable {
    private String title;
    private java.util.List&lt;String&gt; sections;     // mutable → needs deep copy

    public Document(String title, java.util.List&lt;String&gt; s){ this.title=title; this.sections=s; }

    @Override public Document clone() {
        // DEEP copy: copy the mutable list so clones don't share state
        return new Document(this.title, new java.util.ArrayList&lt;&gt;(this.sections));
    }
}
// A registry of prototypes to clone from:
class DocRegistry {
    private final java.util.Map&lt;String,Document&gt; prototypes = new java.util.HashMap&lt;&gt;();
    void register(String key, Document proto){ prototypes.put(key, proto); }
    Document create(String key){ return prototypes.get(key).clone(); }   // cheap creation
}</code></pre>
      <div class="sd-callout warn"><span class="sd-callout-l">Trap</span>Default <code>Object.clone()</code> is a <em>shallow</em> copy — nested mutable fields are shared between original and clone. Implement a proper deep copy (copy constructor / serialization / manual) when fields are mutable.</div>
    </div></section>
    <section class="sd-block" data-sec="interview"><h2 class="sd-h2">3. Interview Q&amp;A</h2><div class="sd-block-body">
      <details class="sd-faq"><summary>Shallow vs deep copy?</summary><div>Shallow copies field references (nested objects shared); deep copy duplicates the whole object graph so the clone is independent. Mutable nested state requires deep copy.</div></details>
      <details class="sd-faq"><summary>When is Prototype useful?</summary><div>When object creation is costly or complex and you can clone a pre-built template (e.g. game entities, configured documents), or to avoid subclassing factories.</div></details>
      <details class="sd-faq"><summary>Why avoid <code>Cloneable</code>?</summary><div>Its contract is awkward (protected clone, no constructor call, shallow by default). Prefer a copy constructor or static factory <code>copyOf</code> for clarity.</div></details>
      <div class="sd-callout tip"><span class="sd-callout-l">Key takeaway</span>Prototype = clone a template to create new objects. Deep-copy mutable state; prefer copy constructors over <code>Cloneable</code>.</div>
    </div></section>
  `

});

/* ════════════════════════════ ARCHITECTURE STYLES ════════════════════════════ */
Object.assign(window.SD_CONTENT, {

  "sd-framework": `
    <section class="sd-block" data-sec="overview"><h2 class="sd-h2">1. Overview</h2><div class="sd-block-body">
      <p>A repeatable <strong>framework for system design interviews</strong>. The goal isn't a "right answer" — it's demonstrating structured thinking: clarify, estimate, design the high-level, deep-dive a component, and discuss trade-offs. A consistent process keeps you from rambling.</p>
    </div></section>
    <section class="sd-block" data-sec="steps"><h2 class="sd-h2">2. The 6-Step Framework</h2><div class="sd-block-body">
      <ol>
        <li><strong>Clarify requirements (3–5 min):</strong> functional (what it does) + non-functional (scale, latency, consistency, availability). State assumptions; define what's in/out of scope.</li>
        <li><strong>Back-of-envelope estimates:</strong> DAU, QPS (read/write), storage/year, bandwidth. Drives every later decision.</li>
        <li><strong>API design:</strong> the core endpoints/contracts (REST/gRPC) — pins down the data model.</li>
        <li><strong>High-level design:</strong> boxes &amp; arrows — clients, LB, gateway, services, DBs, cache, queue. Draw it.</li>
        <li><strong>Deep dive:</strong> the interviewer picks (or you pick) a component — data model, sharding, the hot path — and detail it.</li>
        <li><strong>Bottlenecks &amp; trade-offs:</strong> SPOFs, scaling reads/writes, caching, consistency choices, failure handling.</li>
      </ol>
      <pre class="mermaid">graph LR
  R[Requirements] --> E[Estimates] --> A[APIs] --> H[High-level] --> D[Deep dive] --> T[Trade-offs]</pre>
    </div></section>
    <section class="sd-block" data-sec="estimates"><h2 class="sd-h2">3. Estimation cheat-sheet</h2><div class="sd-block-body">
      <ul>
        <li><strong>QPS</strong> = DAU × actions/user/day ÷ 86,400. Peak ≈ 2–3× average.</li>
        <li>Read:write often 100:1 (social) → scale reads with cache + replicas.</li>
        <li>Storage = items/day × size × retention. 1M writes/day × 1 KB ≈ 1 GB/day ≈ 365 GB/yr.</li>
        <li>Latency budgets: memory ns, SSD µs, network ms, cross-region 10s–100s ms.</li>
      </ul>
    </div></section>
    <section class="sd-block" data-sec="interview"><h2 class="sd-h2">4. Interview Tips</h2><div class="sd-block-body">
      <details class="sd-faq"><summary>What do interviewers actually grade?</summary><div>Structured approach, asking clarifying questions, justifying decisions with the requirements/estimates, knowing trade-offs (not buzzwords), and communication — not memorized "perfect" diagrams.</div></details>
      <details class="sd-faq"><summary>Common mistakes?</summary><div>Jumping to a solution before clarifying scope; ignoring estimates; over-engineering; silence; not stating CAP/consistency trade-offs.</div></details>
      <div class="sd-callout tip"><span class="sd-callout-l">Key takeaway</span>Requirements → Estimates → APIs → High-level → Deep-dive → Trade-offs. Drive every decision from numbers and stated requirements.</div>
    </div></section>
  `,

  "scale-to-millions": `
    <section class="sd-block" data-sec="overview"><h2 class="sd-h2">1. Overview</h2><div class="sd-block-body">
      <p>How a system evolves from a single server to serving millions of users — the canonical scaling narrative (from <em>System Design Interview</em> by Alex Xu). Each step removes the next bottleneck.</p>
    </div></section>
    <section class="sd-block" data-sec="journey"><h2 class="sd-h2">2. The scaling journey</h2><div class="sd-block-body">
      <ol>
        <li><strong>Single server</strong> (app + DB together).</li>
        <li><strong>Separate the database</strong> from the web tier (scale independently).</li>
        <li><strong>Load balancer + multiple stateless app servers</strong> (horizontal scale, HA).</li>
        <li><strong>Database replication</strong> — primary for writes, read replicas for reads (read:write is usually heavy on reads).</li>
        <li><strong>Cache</strong> (Redis) for hot reads; CDN for static assets/edge.</li>
        <li><strong>Stateless tier + shared session store</strong> (move session to Redis so any server handles any request).</li>
        <li><strong>Database sharding</strong> when one DB can't hold the data/writes (see <a href="#sharding-partitioning">Sharding</a>).</li>
        <li><strong>Message queues + async processing</strong> to decouple and absorb spikes.</li>
        <li><strong>Multi-region + autoscaling + observability.</strong></li>
      </ol>
      <pre class="mermaid">graph TD
  U[Users] --> CDN[CDN]
  U --> LB[Load Balancer]
  LB --> A1[App]
  LB --> A2[App]
  A1 --> CA[(Redis cache)]
  A1 --> P[(DB primary)]
  P --> R1[(read replica)]
  A1 --> Q[Message Queue] --> W[Workers]</pre>
    </div></section>
    <section class="sd-block" data-sec="scaling"><h2 class="sd-h2">3. Vertical vs Horizontal</h2><div class="sd-block-body">
      <table><thead><tr><th></th><th>Vertical (scale up)</th><th>Horizontal (scale out)</th></tr></thead><tbody>
        <tr><td>How</td><td>Bigger machine</td><td>More machines</td></tr>
        <tr><td>Limit</td><td>Hardware ceiling</td><td>~Unlimited</td></tr>
        <tr><td>HA</td><td>SPOF</td><td>Redundant</td></tr>
        <tr><td>Complexity</td><td>Low</td><td>Higher (LB, state, consistency)</td></tr>
      </tbody></table>
      <p>Key enabler of horizontal scaling: <strong>stateless</strong> app servers (push state to DB/cache).</p>
    </div></section>
    <section class="sd-block" data-sec="interview"><h2 class="sd-h2">4. Interview Q&amp;A</h2><div class="sd-block-body">
      <details class="sd-faq"><summary>How do you scale reads vs writes?</summary><div>Reads: caching (Redis), read replicas, CDN. Writes: sharding/partitioning, async queues, write-optimized stores. Most systems are read-heavy, so cache+replicas go far.</div></details>
      <details class="sd-faq"><summary>Why must app servers be stateless?</summary><div>So a load balancer can route any request to any instance and you can add/remove servers freely. Session/state lives in a shared store (Redis/DB).</div></details>
      <details class="sd-faq"><summary>When introduce a message queue?</summary><div>To decouple producers/consumers, absorb traffic spikes (buffer), and run slow work async (emails, image processing) without blocking the request path.</div></details>
      <div class="sd-callout tip"><span class="sd-callout-l">Key takeaway</span>Split tiers → LB + stateless app → replicas + cache + CDN → shared session → shard → queues → multi-region. Remove one bottleneck at a time.</div>
    </div></section>
  `,

  "tradeoffs": `
    <section class="sd-block" data-sec="overview"><h2 class="sd-h2">1. Overview</h2><div class="sd-block-body">
      <p>System design is the art of <strong>trade-offs</strong> — there's no free lunch. Senior engineers are judged on whether they can name the tension and justify a choice for the context (latency vs consistency, cost vs performance, simplicity vs flexibility).</p>
    </div></section>
    <section class="sd-block" data-sec="cap"><h2 class="sd-h2">2. CAP & PACELC</h2><div class="sd-block-body">
      <p><strong>CAP:</strong> in a network <strong>P</strong>artition you must choose <strong>C</strong>onsistency or <strong>A</strong>vailability. CP systems reject requests to stay consistent (e.g. ZooKeeper, HBase); AP systems stay available but may serve stale data (e.g. Cassandra, DynamoDB).</p>
      <p><strong>PACELC</strong> extends it: <em>if Partition → A or C; Else (normal) → Latency or Consistency.</em> Even without partitions you trade latency for consistency (e.g. sync vs async replication).</p>
    </div></section>
    <section class="sd-block" data-sec="table"><h2 class="sd-h2">3. Common trade-offs</h2><div class="sd-block-body">
      <table><thead><tr><th>Tension</th><th>Lever A</th><th>Lever B</th></tr></thead><tbody>
        <tr><td>Consistency vs Availability</td><td>Strong (CP)</td><td>Eventual (AP)</td></tr>
        <tr><td>Latency vs Consistency</td><td>Sync replication</td><td>Async replication</td></tr>
        <tr><td>SQL vs NoSQL</td><td>ACID, joins, schema</td><td>Scale, flexible schema, denormalized</td></tr>
        <tr><td>Normalization vs Denormalization</td><td>No duplication, write-simple</td><td>Read-fast, duplicated</td></tr>
        <tr><td>Monolith vs Microservices</td><td>Simple, fast to start</td><td>Independent scale/deploy, complex</td></tr>
        <tr><td>Push vs Pull</td><td>Real-time, server load</td><td>Client controls, lag</td></tr>
        <tr><td>Cost vs Performance</td><td>More cache/replicas</td><td>Cheaper, slower</td></tr>
      </tbody></table>
    </div></section>
    <section class="sd-block" data-sec="interview"><h2 class="sd-h2">4. Interview Q&amp;A</h2><div class="sd-block-body">
      <details class="sd-faq"><summary>Explain CAP with an example.</summary><div>During a network partition, a banking ledger chooses Consistency (reject writes rather than diverge) = CP; a social feed chooses Availability (serve possibly-stale posts) = AP. You can't have both C and A under a partition.</div></details>
      <details class="sd-faq"><summary>SQL or NoSQL — how do you decide?</summary><div>SQL for strong consistency, complex queries/joins, transactions, structured data. NoSQL for massive scale, flexible/denormalized schema, high write throughput, and simple access patterns. Often both (polyglot persistence).</div></details>
      <details class="sd-faq"><summary>Why is "it depends" the right answer?</summary><div>Because the best choice depends on requirements (latency target, consistency needs, scale, team, budget). State the trade-off and justify for the given context.</div></details>
      <div class="sd-callout tip"><span class="sd-callout-l">Key takeaway</span>Name the tension (CAP/PACELC, SQL/NoSQL, sync/async, mono/micro) and justify the choice from requirements. There's no universally correct answer.</div>
    </div></section>
  `,

  "docker-fundamentals": `
    <section class="sd-block" data-sec="overview"><h2 class="sd-h2">1. Overview</h2><div class="sd-block-body">
      <p><strong>Docker</strong> packages an app + its dependencies into a portable <strong>image</strong> that runs as an isolated <strong>container</strong> — "works on my machine" solved. Containers share the host kernel (unlike VMs), making them lightweight and fast to start. The foundation of modern deployment + Kubernetes.</p>
    </div></section>
    <section class="sd-block" data-sec="concepts"><h2 class="sd-h2">2. Core concepts</h2><div class="sd-block-body">
      <ul>
        <li><strong>Image:</strong> immutable, layered template (built from a Dockerfile).</li>
        <li><strong>Container:</strong> a running instance of an image (isolated process via namespaces + cgroups).</li>
        <li><strong>Registry:</strong> stores images (Docker Hub, ECR, GHCR).</li>
        <li><strong>Volume:</strong> persistent storage outside the container's writable layer.</li>
        <li><strong>Network:</strong> containers communicate over bridge/overlay networks.</li>
      </ul>
    </div></section>
    <section class="sd-block" data-sec="dockerfile"><h2 class="sd-h2">3. Multi-stage Dockerfile for Spring Boot</h2><div class="sd-block-body">
      <pre><code class="language-docker"># ---- build stage ----
FROM eclipse-temurin:21-jdk AS build
WORKDIR /app
COPY . .
RUN ./mvnw -q clean package -DskipTests

# ---- runtime stage (small, no build tools) ----
FROM eclipse-temurin:21-jre AS runtime
WORKDIR /app
COPY --from=build /app/target/app.jar app.jar
RUN addgroup --system app &amp;&amp; adduser --system --ingroup app app   # non-root
USER app
EXPOSE 8080
ENTRYPOINT ["java","-XX:MaxRAMPercentage=75","-jar","app.jar"]</code></pre>
      <pre><code class="language-bash">docker build -t myapp:1.0 .
docker run -p 8080:8080 -e SPRING_PROFILES_ACTIVE=prod myapp:1.0
docker compose up -d        # multi-container: app + postgres + redis</code></pre>
    </div></section>
    <section class="sd-block" data-sec="best"><h2 class="sd-h2">4. Best Practices</h2><div class="sd-block-body">
      <ul><li><strong>Multi-stage builds</strong> → small runtime image (JRE, not JDK).</li><li>Run as <strong>non-root</strong>; use minimal/distroless base images.</li><li>Order layers from least- to most-frequently changed (cache deps before code).</li><li>One process per container; configuration via env vars; <code>.dockerignore</code> to slim context.</li><li>Add a <code>HEALTHCHECK</code>; tag images with versions, not just <code>latest</code>.</li></ul>
    </div></section>
    <section class="sd-block" data-sec="interview"><h2 class="sd-h2">5. Interview Q&amp;A</h2><div class="sd-block-body">
      <details class="sd-faq"><summary>Container vs VM?</summary><div>VMs virtualize hardware and run a full guest OS (heavy, slow boot, strong isolation). Containers share the host kernel and isolate at the process level (lightweight, sub-second start, less isolation). Containers pack denser.</div></details>
      <details class="sd-faq"><summary>Image vs container?</summary><div>An image is the immutable, layered blueprint; a container is a running, writable instance of it. Many containers can run from one image.</div></details>
      <details class="sd-faq"><summary>Why multi-stage builds?</summary><div>Compile in a fat JDK stage, copy only the artifact into a slim JRE runtime stage — drastically smaller, more secure images (no build tools/source).</div></details>
      <div class="sd-callout tip"><span class="sd-callout-l">Key takeaway</span>Images (immutable, layered) → containers (running, isolated via kernel namespaces/cgroups). Multi-stage, non-root, small base, env config.</div>
    </div></section>
  `,

  "junit-spring-boot": `
    <section class="sd-block" data-sec="overview"><h2 class="sd-h2">1. Overview</h2><div class="sd-block-body">
      <p>Testing in Spring Boot spans the <strong>test pyramid</strong>: many fast <strong>unit tests</strong> (JUnit 5 + Mockito), fewer <strong>slice tests</strong> (<code>@WebMvcTest</code>, <code>@DataJpaTest</code>), and a few <strong>integration tests</strong> (<code>@SpringBootTest</code> + Testcontainers for real DBs). Good tests are the safety net for refactoring and CI/CD.</p>
    </div></section>
    <section class="sd-block" data-sec="unit"><h2 class="sd-h2">2. Unit test — JUnit 5 + Mockito</h2><div class="sd-block-body">
      <pre><code class="language-java">@org.junit.jupiter.api.extension.ExtendWith(org.mockito.junit.jupiter.MockitoExtension.class)
class OrderServiceTest {
    @org.mockito.Mock OrderRepository repo;
    @org.mockito.Mock PaymentClient payment;
    @org.mockito.InjectMocks OrderService service;

    @org.junit.jupiter.api.Test
    void placesOrder_whenPaymentSucceeds() {
        org.mockito.Mockito.when(payment.charge(org.mockito.ArgumentMatchers.any())).thenReturn(PaymentResult.ok());
        org.mockito.Mockito.when(repo.save(org.mockito.ArgumentMatchers.any())).thenAnswer(i -&gt; i.getArgument(0));

        Order o = service.place(new OrderRequest("sku-1", 2));

        org.junit.jupiter.api.Assertions.assertEquals(OrderStatus.CONFIRMED, o.getStatus());
        org.mockito.Mockito.verify(repo).save(org.mockito.ArgumentMatchers.any());   // behaviour verification
    }
}</code></pre>
    </div></section>
    <section class="sd-block" data-sec="integration"><h2 class="sd-h2">3. Integration test — Testcontainers (real Postgres)</h2><div class="sd-block-body">
      <pre><code class="language-java">@org.springframework.boot.test.context.SpringBootTest
@org.testcontainers.junit.jupiter.Testcontainers
class OrderIntegrationTest {
    @org.testcontainers.junit.jupiter.Container
    static org.testcontainers.containers.PostgreSQLContainer&lt;?&gt; pg =
        new org.testcontainers.containers.PostgreSQLContainer&lt;&gt;("postgres:16");

    @org.springframework.test.context.DynamicPropertySource
    static void props(org.springframework.test.context.DynamicPropertyRegistry r){
        r.add("spring.datasource.url", pg::getJdbcUrl);
        r.add("spring.datasource.username", pg::getUsername);
        r.add("spring.datasource.password", pg::getPassword);
    }
    @org.springframework.beans.factory.annotation.Autowired OrderRepository repo;

    @org.junit.jupiter.api.Test void persistsToRealDb(){
        repo.save(new OrderEntity(/*...*/));
        org.junit.jupiter.api.Assertions.assertEquals(1, repo.count());   // tests against a real DB
    }
}</code></pre>
    </div></section>
    <section class="sd-block" data-sec="best"><h2 class="sd-h2">4. Best Practices</h2><div class="sd-block-body">
      <ul><li>Follow the test pyramid — mostly unit, some slice, few E2E (slow).</li><li>Mock external collaborators; don't mock value objects.</li><li>Testcontainers over H2 for DB tests (tests the real engine/SQL).</li><li>Name tests by behaviour; one logical assertion/concept per test; use AAA (Arrange-Act-Assert).</li><li>Keep tests independent &amp; deterministic; run in CI.</li></ul>
    </div></section>
    <section class="sd-block" data-sec="interview"><h2 class="sd-h2">5. Interview Q&amp;A</h2><div class="sd-block-body">
      <details class="sd-faq"><summary>Unit vs integration test?</summary><div>Unit tests one class in isolation with mocked dependencies (fast, pinpoint failures). Integration tests multiple components together (Spring context, real DB) — slower but catches wiring/SQL/serialization issues.</div></details>
      <details class="sd-faq"><summary>Why Testcontainers over H2?</summary><div>H2 isn't your production DB — dialect/SQL differences hide bugs. Testcontainers spins up the real Postgres/MySQL/Kafka in Docker so tests match prod behaviour.</div></details>
      <details class="sd-faq"><summary>@Mock vs @MockBean?</summary><div><code>@Mock</code> (Mockito) is a plain mock for unit tests. <code>@MockBean</code> replaces a bean in the Spring context for slice/integration tests.</div></details>
      <div class="sd-callout tip"><span class="sd-callout-l">Key takeaway</span>Pyramid: JUnit5+Mockito units, slice tests, Testcontainers integration. Mock collaborators, test real DBs, keep tests fast &amp; deterministic.</div>
    </div></section>
  `,

  "redis-fundamentals": `
    <section class="sd-block" data-sec="overview"><h2 class="sd-h2">1. Overview</h2><div class="sd-block-body">
      <p><strong>Redis</strong> is an in-memory data-structure store used as a cache, message broker, rate limiter, distributed lock and more. It's single-threaded for command execution (no lock contention), microsecond-fast, and supports rich data types beyond key-value.</p>
    </div></section>
    <section class="sd-block" data-sec="types"><h2 class="sd-h2">2. Data structures & uses</h2><div class="sd-block-body">
      <table><thead><tr><th>Type</th><th>Use case</th></tr></thead><tbody>
        <tr><td><strong>String</strong></td><td>Cache values, counters (<code>INCR</code>), rate-limit windows</td></tr>
        <tr><td><strong>Hash</strong></td><td>Objects (user:123 → fields), availability counters</td></tr>
        <tr><td><strong>List</strong></td><td>Queues, recent activity (<code>LPUSH</code>/<code>BRPOP</code>)</td></tr>
        <tr><td><strong>Set</strong></td><td>Unique items, tags, membership</td></tr>
        <tr><td><strong>Sorted Set (ZSet)</strong></td><td>Leaderboards, rate limiting, priority/scheduled jobs</td></tr>
        <tr><td><strong>Stream</strong></td><td>Event log / lightweight Kafka-like messaging</td></tr>
        <tr><td>HyperLogLog / Bitmap / Geo</td><td>Cardinality, flags, geo-radius queries</td></tr>
      </tbody></table>
    </div></section>
    <section class="sd-block" data-sec="internal"><h2 class="sd-h2">3. Internals & persistence</h2><div class="sd-block-body">
      <ul>
        <li><strong>Single-threaded</strong> command loop (atomic ops, no races) — but uses IO threads/multiple instances for throughput.</li>
        <li><strong>Persistence:</strong> RDB (point-in-time snapshots) and AOF (append-only log of writes) — combine for durability vs speed.</li>
        <li><strong>Eviction:</strong> <code>maxmemory</code> + policy (<code>allkeys-lru</code>, <code>volatile-ttl</code>, <code>allkeys-lfu</code>).</li>
        <li><strong>Scaling:</strong> replication (primary→replicas), Sentinel (HA/failover), Cluster (sharding across nodes via hash slots).</li>
      </ul>
    </div></section>
    <section class="sd-block" data-sec="java"><h2 class="sd-h2">4. Java usage (Spring Data Redis)</h2><div class="sd-block-body">
      <pre><code class="language-java">@Service
public class LeaderboardService {
    private final org.springframework.data.redis.core.StringRedisTemplate redis;
    public LeaderboardService(org.springframework.data.redis.core.StringRedisTemplate r){ this.redis = r; }
    public void addScore(String user, double score){
        redis.opsForZSet().incrementScore("leaderboard", user, score);    // sorted set
    }
    public java.util.Set&lt;String&gt; top(int n){
        return redis.opsForZSet().reverseRange("leaderboard", 0, n - 1);  // O(log n + n)
    }
}</code></pre>
    </div></section>
    <section class="sd-block" data-sec="interview"><h2 class="sd-h2">5. Interview Q&amp;A</h2><div class="sd-block-body">
      <details class="sd-faq"><summary>Why is Redis fast despite being single-threaded?</summary><div>In-memory data, an efficient event loop, no lock contention (commands are atomic), and optimized data structures. The single thread also makes operations atomic by default.</div></details>
      <details class="sd-faq"><summary>RDB vs AOF?</summary><div>RDB = periodic snapshots (compact, fast restart, may lose recent writes). AOF = logs every write (more durable, larger, slower restart). Many run both.</div></details>
      <details class="sd-faq"><summary>Redis vs Memcached?</summary><div>Memcached is a simple multi-threaded key-value cache. Redis adds rich data types, persistence, replication, pub/sub, scripting, and clustering — more versatile.</div></details>
      <details class="sd-faq"><summary>How does Redis Cluster shard?</summary><div>16,384 hash slots distributed across nodes; a key maps to a slot via CRC16. Clients are redirected (MOVED/ASK) to the owning node.</div></details>
      <div class="sd-callout tip"><span class="sd-callout-l">Key takeaway</span>In-memory, single-threaded (atomic), rich types (ZSet/Hash/Stream). Cache, counters, locks, leaderboards, rate limits. RDB+AOF, replication/Sentinel/Cluster.</div>
    </div></section>
  `,

  "cqrs-pattern": `
    <section class="sd-block" data-sec="overview"><h2 class="sd-h2">1. Overview</h2><div class="sd-block-body">
      <p><strong>CQRS (Command Query Responsibility Segregation)</strong> separates the <em>write</em> model (commands that change state) from the <em>read</em> model (queries). Each is optimized independently — writes for consistency/validation, reads for fast, denormalized views. Useful when read and write workloads diverge sharply.</p>
    </div></section>
    <section class="sd-block" data-sec="how"><h2 class="sd-h2">2. How it works</h2><div class="sd-block-body">
      <pre class="mermaid">graph TD
  C[Command] --> WM[Write Model - normalized, validates]
  WM --> DB[(Write DB)]
  WM --> E[Domain events]
  E --> P[Projector]
  P --> RM[(Read DB - denormalized views)]
  Q[Query] --> RM</pre>
      <ul>
        <li><strong>Commands</strong> go through the write model (rich domain, invariants, single source of truth).</li>
        <li>Events update one or more <strong>read models</strong> (materialized views) tailored to queries.</li>
        <li>Read and write stores can differ (Postgres write, Elasticsearch/Redis read) and scale separately.</li>
        <li>Often <strong>eventually consistent</strong> (the read side lags the write side briefly).</li>
      </ul>
    </div></section>
    <section class="sd-block" data-sec="java"><h2 class="sd-h2">3. Sketch</h2><div class="sd-block-body">
      <pre><code class="language-java">// Command side
public record PlaceOrderCommand(String userId, java.util.List&lt;Item&gt; items) {}
@Service class OrderCommandHandler {
    public void handle(PlaceOrderCommand cmd){
        Order order = Order.create(cmd);        // validate invariants
        writeRepo.save(order);
        events.publish(new OrderPlacedEvent(order.getId(), /*...*/));  // → updates read model
    }
}
// Query side — reads a denormalized view, no joins
@Service class OrderQueryService {
    public OrderSummaryView getSummary(String orderId){ return readRepo.findView(orderId); }
}
// Projector keeps the read model in sync
@Component class OrderProjector {
    @org.springframework.context.event.EventListener
    public void on(OrderPlacedEvent e){ readRepo.upsertView(toView(e)); }
}</code></pre>
    </div></section>
    <section class="sd-block" data-sec="interview"><h2 class="sd-h2">4. Interview Q&amp;A</h2><div class="sd-block-body">
      <details class="sd-faq"><summary>When use CQRS?</summary><div>When read and write workloads/shapes differ greatly (read-heavy with complex queries vs write-heavy with strict validation), when you need multiple specialized read views, or to scale reads/writes independently. Avoid for simple CRUD — it adds complexity.</div></details>
      <details class="sd-faq"><summary>What's the main downside?</summary><div>Eventual consistency between write and read models, plus operational complexity (two models, projectors, sync). Don't reach for it prematurely.</div></details>
      <details class="sd-faq"><summary>Does CQRS require Event Sourcing?</summary><div>No. They pair well but are independent: CQRS just separates read/write models; you can update read views from events or directly.</div></details>
      <div class="sd-callout tip"><span class="sd-callout-l">Key takeaway</span>Separate write (validate/normalized) from read (denormalized views), synced via events. Independent scaling; eventual consistency. Use when read/write diverge.</div>
    </div></section>
  `,

  "saga-pattern": `
    <section class="sd-block" data-sec="overview"><h2 class="sd-h2">1. Overview</h2><div class="sd-block-body">
      <p>A <strong>Saga</strong> manages a distributed transaction across microservices as a sequence of <em>local</em> transactions, each publishing an event that triggers the next. If a step fails, the saga runs <strong>compensating transactions</strong> to undo prior steps — preserving data consistency without a distributed lock / 2PC.</p>
    </div></section>
    <section class="sd-block" data-sec="why"><h2 class="sd-h2">2. Why (no 2PC)</h2><div class="sd-block-body">
      <p>Each microservice owns its own database, so a single ACID transaction can't span them. Two-phase commit (2PC) is slow, blocking and reduces availability. Sagas trade atomicity for <strong>eventual consistency</strong> with explicit compensation.</p>
    </div></section>
    <section class="sd-block" data-sec="types"><h2 class="sd-h2">3. Choreography vs Orchestration</h2><div class="sd-block-body">
      <table><thead><tr><th></th><th>Choreography</th><th>Orchestration</th></tr></thead><tbody>
        <tr><td>Control</td><td>Decentralized — services react to events</td><td>Central orchestrator directs steps</td></tr>
        <tr><td>Coupling</td><td>Loose; no single controller</td><td>Orchestrator knows the flow</td></tr>
        <tr><td>Pros</td><td>Simple for few steps</td><td>Clear, easy to monitor/modify complex flows</td></tr>
        <tr><td>Cons</td><td>Hard to track / cyclic events</td><td>Orchestrator is a focal point</td></tr>
      </tbody></table>
      <pre class="mermaid">sequenceDiagram
  participant O as Order Orchestrator
  participant P as Payment
  participant I as Inventory
  participant S as Shipping
  O->>P: charge
  P-->>O: charged
  O->>I: reserve stock
  I-->>O: reserved
  O->>S: ship
  S--xO: FAILED
  O->>I: compensate: release stock
  O->>P: compensate: refund</pre>
    </div></section>
    <section class="sd-block" data-sec="java"><h2 class="sd-h2">4. Compensation sketch</h2><div class="sd-block-body">
      <pre><code class="language-java">// Orchestrated saga (simplified). Each step has an action + compensation.
public void placeOrder(OrderRequest req){
    var ctx = new SagaContext(req);
    try {
        ctx.paymentId   = payment.charge(req);          // step 1
        ctx.reservation = inventory.reserve(req);       // step 2
        shipping.schedule(req);                         // step 3
        orders.markConfirmed(req.orderId());
    } catch (Exception e) {
        // run compensations in reverse for completed steps (idempotent!)
        if (ctx.reservation != null) inventory.release(ctx.reservation);
        if (ctx.paymentId != null)   payment.refund(ctx.paymentId);
        orders.markFailed(req.orderId());
    }
}</code></pre>
      <p>Production: use a framework (Axon, Camunda, Temporal, Eventuate) for durable state, retries and timeouts. Compensations and steps must be <strong>idempotent</strong> (see <a href="#idempotency">Idempotency</a>).</p>
    </div></section>
    <section class="sd-block" data-sec="interview"><h2 class="sd-h2">5. Interview Q&amp;A</h2><div class="sd-block-body">
      <details class="sd-faq"><summary>Why not a distributed (2PC) transaction?</summary><div>2PC blocks resources during the prepare phase, lowers availability, and doesn't scale across many services/databases. Sagas use local transactions + compensation for better availability and loose coupling, at the cost of eventual consistency.</div></details>
      <details class="sd-faq"><summary>Choreography or orchestration?</summary><div>Choreography (event-driven) for simple, few-step flows with loose coupling; orchestration (a central coordinator) for complex flows needing visibility, ordering, and easy modification.</div></details>
      <details class="sd-faq"><summary>What's a compensating transaction?</summary><div>A semantic undo of a completed step (refund a charge, release reserved stock) — you can't "rollback" an already-committed local transaction, so you counteract it. Must be idempotent.</div></details>
      <details class="sd-faq"><summary>What if a compensation itself fails?</summary><div>Retry with backoff, alert, and use durable saga state so it can resume; some steps may need manual intervention / dead-letter handling.</div></details>
      <div class="sd-callout tip"><span class="sd-callout-l">Key takeaway</span>Saga = sequence of local transactions + compensations for cross-service consistency without 2PC. Choreography (events) vs orchestration (coordinator); make steps idempotent.</div>
    </div></section>
  `,

  "zero-downtime-deploy": `
    <section class="sd-block" data-sec="overview"><h2 class="sd-h2">1. Overview</h2><div class="sd-block-body">
      <p><strong>Zero-downtime deployment</strong> ships new versions without interrupting users. The main strategies — rolling, blue-green, canary — differ in risk, cost and rollback speed. Combined with backward-compatible changes and health checks, they enable continuous delivery.</p>
    </div></section>
    <section class="sd-block" data-sec="strategies"><h2 class="sd-h2">2. Strategies</h2><div class="sd-block-body">
      <table><thead><tr><th>Strategy</th><th>How</th><th>Rollback</th><th>Cost</th></tr></thead><tbody>
        <tr><td><strong>Rolling</strong></td><td>Replace instances batch by batch</td><td>Slow (roll back batches)</td><td>Low (no extra fleet)</td></tr>
        <tr><td><strong>Blue-Green</strong></td><td>Run new (green) alongside old (blue); switch traffic</td><td>Instant (flip back)</td><td>High (2× fleet)</td></tr>
        <tr><td><strong>Canary</strong></td><td>Route a small % to new, watch metrics, ramp up</td><td>Fast (stop ramp)</td><td>Medium</td></tr>
        <tr><td>Feature flags</td><td>Decouple deploy from release; toggle at runtime</td><td>Instant (toggle off)</td><td>Low</td></tr>
      </tbody></table>
      <pre class="mermaid">graph LR
  LB[Load Balancer] -->|95%| V1[v1 stable]
  LB -->|5% canary| V2[v2 new]
  V2 -.metrics ok.-> RAMP[ramp to 100%]
  V2 -.errors.-> ROLLBACK[abort]</pre>
    </div></section>
    <section class="sd-block" data-sec="db"><h2 class="sd-h2">3. The hard part: database migrations</h2><div class="sd-block-body">
      <p>The app and schema must be compatible during the rollout (old + new code run simultaneously). Use the <strong>expand–contract</strong> (parallel change) pattern:</p>
      <ol>
        <li><strong>Expand:</strong> add new column/table (nullable, backward-compatible). Deploy code that writes both old &amp; new.</li>
        <li><strong>Migrate:</strong> backfill data.</li>
        <li><strong>Contract:</strong> switch reads to new, then in a later release drop the old column.</li>
      </ol>
      <div class="sd-callout warn"><span class="sd-callout-l">Never</span>Make a breaking schema change (rename/drop column) in the same release that needs it. Old instances still running will crash.</div>
    </div></section>
    <section class="sd-block" data-sec="k8s"><h2 class="sd-h2">4. Kubernetes enablers</h2><div class="sd-block-body">
      <ul><li><strong>Readiness probes</strong> — only route traffic to healthy pods; rolling update waits for readiness.</li><li><strong>maxSurge/maxUnavailable</strong> control the rollout pace; <code>kubectl rollout undo</code> reverts.</li><li><strong>Graceful shutdown</strong> — handle SIGTERM, drain in-flight requests (preStop hook + termination grace period).</li><li>Service mesh (Istio/Argo Rollouts) for canary traffic splitting + automated analysis.</li></ul>
    </div></section>
    <section class="sd-block" data-sec="interview"><h2 class="sd-h2">5. Interview Q&amp;A</h2><div class="sd-block-body">
      <details class="sd-faq"><summary>Blue-green vs canary?</summary><div>Blue-green flips all traffic at once between two full environments (instant rollback, 2× cost, no gradual validation). Canary shifts a small percentage first and validates with real traffic/metrics before ramping (cheaper, catches issues early, slower).</div></details>
      <details class="sd-faq"><summary>How do you do a zero-downtime schema change?</summary><div>Expand–contract: additive/backward-compatible change first, dual-write, backfill, switch reads, then remove the old column in a later release — so old and new app versions both work during rollout.</div></details>
      <details class="sd-faq"><summary>What ensures no requests are dropped during a rollout?</summary><div>Readiness probes (no traffic until ready) + graceful shutdown (drain in-flight on SIGTERM) + load balancer connection draining.</div></details>
      <div class="sd-callout tip"><span class="sd-callout-l">Key takeaway</span>Rolling/blue-green/canary + backward-compatible (expand–contract) DB changes + readiness probes + graceful shutdown = no downtime. Feature flags decouple deploy from release.</div>
    </div></section>
  `,

  "cqrs-event-sourcing": `
    <section class="sd-block" data-sec="overview"><h2 class="sd-h2">1. Overview</h2><div class="sd-block-body">
      <p><strong>Event Sourcing</strong> stores state as an immutable, append-only log of <em>events</em> (what happened) instead of the current state. The current state is derived by replaying events. Paired with <strong>CQRS</strong>, events feed read-model projections. It gives a full audit trail and temporal queries — at the cost of complexity.</p>
    </div></section>
    <section class="sd-block" data-sec="how"><h2 class="sd-h2">2. How it works</h2><div class="sd-block-body">
      <ul>
        <li>A command produces one or more <strong>events</strong> appended to an event store (never updated/deleted).</li>
        <li>Current state = <code>fold(events)</code> — replay to rebuild an aggregate.</li>
        <li><strong>Snapshots</strong> periodically capture state so you don't replay millions of events.</li>
        <li>Projections build read models (CQRS) from the event stream.</li>
      </ul>
      <pre class="mermaid">graph LR
  CMD[Command] --> AGG[Aggregate]
  AGG --> EV[Append events]
  EV --> ES[(Event Store - append only)]
  ES --> PRJ[Projections] --> RM[(Read models)]
  ES --> SNAP[Snapshots]</pre>
    </div></section>
    <section class="sd-block" data-sec="example"><h2 class="sd-h2">3. Example — account as events</h2><div class="sd-block-body">
      <pre><code class="language-java">// Events (immutable facts)
sealed interface AccountEvent permits Opened, Deposited, Withdrawn {}
record Opened(String id) implements AccountEvent {}
record Deposited(java.math.BigDecimal amt) implements AccountEvent {}
record Withdrawn(java.math.BigDecimal amt) implements AccountEvent {}

// Rebuild state by folding events
class Account {
    java.math.BigDecimal balance = java.math.BigDecimal.ZERO;
    static Account replay(java.util.List&lt;AccountEvent&gt; events){
        Account a = new Account();
        for (var e : events) a.apply(e);
        return a;
    }
    void apply(AccountEvent e){
        if (e instanceof Deposited d) balance = balance.add(d.amt());
        else if (e instanceof Withdrawn w) balance = balance.subtract(w.amt());
    }
}
// "What was the balance last Tuesday?" → replay events up to that timestamp.</code></pre>
    </div></section>
    <section class="sd-block" data-sec="interview"><h2 class="sd-h2">4. Interview Q&amp;A</h2><div class="sd-block-body">
      <details class="sd-faq"><summary>Benefits of event sourcing?</summary><div>Complete audit trail, temporal queries ("state at time T"), easy to build new read models by replaying, natural fit for event-driven systems, and no lossy in-place updates.</div></details>
      <details class="sd-faq"><summary>Drawbacks?</summary><div>Complexity, eventual consistency, querying current state requires replay/projections, schema evolution of old events is tricky, and large event volumes need snapshots.</div></details>
      <details class="sd-faq"><summary>What are snapshots for?</summary><div>To avoid replaying the entire history — periodically persist the aggregate's state so you replay only events since the last snapshot.</div></details>
      <details class="sd-faq"><summary>When NOT to use it?</summary><div>Simple CRUD apps where an audit log/temporal queries aren't needed — the overhead outweighs the benefits.</div></details>
      <div class="sd-callout tip"><span class="sd-callout-l">Key takeaway</span>Store events (append-only) not state; rebuild via replay + snapshots; project to CQRS read models. Audit + time-travel; complex — use when those matter.</div>
    </div></section>
  `

});

/* ════════════════════════════ BEHAVIORAL PATTERNS ════════════════════════════ */
Object.assign(window.SD_CONTENT, {

  "observer": `
    <section class="sd-block" data-sec="overview"><h2 class="sd-h2">1. Overview</h2><div class="sd-block-body">
      <p>The <strong>Observer</strong> pattern defines a one-to-many dependency: when a <em>subject</em> changes state, all registered <em>observers</em> are notified automatically. It's the backbone of event-driven systems, UI listeners, pub/sub, and Spring's <code>ApplicationEvent</code>.</p>
    </div></section>
    <section class="sd-block" data-sec="java"><h2 class="sd-h2">2. Implementation</h2><div class="sd-block-body">
      <pre><code class="language-java">interface Observer&lt;T&gt; { void update(T event); }
class Subject&lt;T&gt; {
    private final java.util.List&lt;Observer&lt;T&gt;&gt; observers = new java.util.concurrent.CopyOnWriteArrayList&lt;&gt;();
    public void subscribe(Observer&lt;T&gt; o){ observers.add(o); }
    public void unsubscribe(Observer&lt;T&gt; o){ observers.remove(o); }
    protected void notifyAll(T event){ for (var o : observers) o.update(event); }
}
// Example: stock price → multiple displays
class Stock extends Subject&lt;Double&gt; {
    private double price;
    public void setPrice(double p){ this.price = p; notifyAll(p); }   // push update
}
Stock s = new Stock();
s.subscribe(price -&gt; System.out.println("Display A: " + price));
s.subscribe(price -&gt; alertService.check(price));</code></pre>
      <p><strong>Spring idiom:</strong> publish an <code>ApplicationEvent</code> and annotate handlers with <code>@EventListener</code> (or <code>@TransactionalEventListener</code>) — decoupled observers managed by the container.</p>
    </div></section>
    <section class="sd-block" data-sec="interview"><h2 class="sd-h2">3. Interview Q&amp;A</h2><div class="sd-block-body">
      <details class="sd-faq"><summary>Observer vs pub/sub?</summary><div>Observer is typically in-process with the subject directly knowing its observers. Pub/sub adds a broker/message channel between publisher and subscriber (fully decoupled, often cross-process). Pub/sub is a distributed evolution of Observer.</div></details>
      <details class="sd-faq"><summary>Push vs pull notification?</summary><div>Push sends the new data with the notification; pull just signals "changed" and observers query for details. Push is simpler; pull avoids sending data observers don't need.</div></details>
      <details class="sd-faq"><summary>Why CopyOnWriteArrayList for observers?</summary><div>Iteration during notify won't throw if an observer (un)subscribes concurrently — safe for read-heavy listener lists.</div></details>
      <div class="sd-callout tip"><span class="sd-callout-l">Key takeaway</span>One subject → many observers, auto-notified on change. Backbone of events/listeners; Spring uses <code>@EventListener</code>.</div>
    </div></section>
  `,

  "strategy": `
    <section class="sd-block" data-sec="overview"><h2 class="sd-h2">1. Overview</h2><div class="sd-block-body">
      <p>The <strong>Strategy</strong> pattern defines a family of interchangeable algorithms behind a common interface and lets you select one at runtime. It replaces sprawling conditionals with polymorphism and is the practical embodiment of the Open/Closed principle.</p>
    </div></section>
    <section class="sd-block" data-sec="java"><h2 class="sd-h2">2. Implementation</h2><div class="sd-block-body">
      <pre><code class="language-java">interface DiscountStrategy { java.math.BigDecimal apply(java.math.BigDecimal price); }
class NoDiscount      implements DiscountStrategy { public java.math.BigDecimal apply(java.math.BigDecimal p){ return p; } }
class PercentDiscount implements DiscountStrategy {
    private final java.math.BigDecimal pct;
    PercentDiscount(java.math.BigDecimal pct){ this.pct = pct; }
    public java.math.BigDecimal apply(java.math.BigDecimal p){ return p.multiply(java.math.BigDecimal.ONE.subtract(pct)); }
}
class Cart {
    private DiscountStrategy strategy = new NoDiscount();
    public void setStrategy(DiscountStrategy s){ this.strategy = s; }   // swap at runtime
    public java.math.BigDecimal checkout(java.math.BigDecimal total){ return strategy.apply(total); }
}</code></pre>
      <p><strong>Spring idiom:</strong> inject <code>Map&lt;String, DiscountStrategy&gt;</code> (bean name → strategy) or a <code>List&lt;Strategy&gt;</code> and pick the one whose <code>supports(type)</code> matches — no <code>if/switch</code>.</p>
    </div></section>
    <section class="sd-block" data-sec="interview"><h2 class="sd-h2">3. Interview Q&amp;A</h2><div class="sd-block-body">
      <details class="sd-faq"><summary>Strategy vs State?</summary><div>Structurally similar (both delegate to a swappable object). Strategy is chosen by the client to vary an algorithm; State changes itself based on internal transitions to vary behaviour over a lifecycle.</div></details>
      <details class="sd-faq"><summary>How does Strategy support OCP?</summary><div>Add a new algorithm = add a new strategy class; the context that uses the interface never changes.</div></details>
      <details class="sd-faq"><summary>Strategy in Spring without if/else?</summary><div>Spring injects all beans implementing the interface into a <code>Map</code>/<code>List</code>; resolve by key or a <code>supports()</code> check — a registry-driven Strategy.</div></details>
      <div class="sd-callout tip"><span class="sd-callout-l">Key takeaway</span>Encapsulate interchangeable algorithms behind an interface; select at runtime. Replaces conditionals; the go-to OCP pattern.</div>
    </div></section>
  `,

  "chain-of-responsibility": `
    <section class="sd-block" data-sec="overview"><h2 class="sd-h2">1. Overview</h2><div class="sd-block-body">
      <p>The <strong>Chain of Responsibility</strong> passes a request along a chain of handlers; each either handles it or forwards it to the next. It decouples sender from receiver and lets you compose processing pipelines — exactly how servlet filters, Spring Security filter chain, and middleware work.</p>
    </div></section>
    <section class="sd-block" data-sec="java"><h2 class="sd-h2">2. Implementation</h2><div class="sd-block-body">
      <pre><code class="language-java">abstract class Handler {
    protected Handler next;
    public Handler setNext(Handler next){ this.next = next; return next; }   // fluent chaining
    public abstract void handle(Request req);
    protected void forward(Request req){ if (next != null) next.handle(req); }
}
class AuthHandler extends Handler {
    public void handle(Request req){
        if (!req.isAuthenticated()) throw new SecurityException("401");
        forward(req);
    }
}
class RateLimitHandler extends Handler {
    public void handle(Request req){
        if (overLimit(req)) throw new RuntimeException("429");
        forward(req);
    }
}
class BusinessHandler extends Handler { public void handle(Request req){ /* final */ } }

// Build the pipeline
Handler chain = new AuthHandler();
chain.setNext(new RateLimitHandler()).setNext(new BusinessHandler());
chain.handle(request);</code></pre>
    </div></section>
    <section class="sd-block" data-sec="interview"><h2 class="sd-h2">3. Interview Q&amp;A</h2><div class="sd-block-body">
      <details class="sd-faq"><summary>Where is CoR used in frameworks?</summary><div>Servlet <code>Filter</code> chains, Spring Security's filter chain, Spring MVC interceptors, logging appenders, and middleware in Express/ASP.NET — each link does one cross-cutting concern then forwards.</div></details>
      <details class="sd-faq"><summary>How is it different from a simple loop of validators?</summary><div>CoR lets each handler decide whether to stop or forward, and the chain is composable/reorderable. A loop runs all unconditionally. CoR supports short-circuiting and dynamic chains.</div></details>
      <div class="sd-callout tip"><span class="sd-callout-l">Key takeaway</span>A pipeline of handlers; each handles or forwards. Decouples sender/receiver; the model behind filter chains/middleware.</div>
    </div></section>
  `,

  "command": `
    <section class="sd-block" data-sec="overview"><h2 class="sd-h2">1. Overview</h2><div class="sd-block-body">
      <p>The <strong>Command</strong> pattern encapsulates a request as an object — bundling the action and its parameters — so you can queue, log, schedule, and <strong>undo</strong> operations. Used for undo/redo, task queues, transactions, and remote/asynchronous execution.</p>
    </div></section>
    <section class="sd-block" data-sec="java"><h2 class="sd-h2">2. Implementation with undo</h2><div class="sd-block-body">
      <pre><code class="language-java">interface Command { void execute(); void undo(); }
class AddTextCommand implements Command {
    private final Document doc; private final String text;
    AddTextCommand(Document doc, String text){ this.doc = doc; this.text = text; }
    public void execute(){ doc.append(text); }
    public void undo(){ doc.removeLast(text.length()); }   // inverse operation
}
// Invoker keeps history for undo/redo
class Editor {
    private final java.util.Deque&lt;Command&gt; history = new java.util.ArrayDeque&lt;&gt;();
    public void run(Command c){ c.execute(); history.push(c); }
    public void undo(){ if (!history.isEmpty()) history.pop().undo(); }
}</code></pre>
      <p>Commands can also be put on a <code>BlockingQueue</code> for asynchronous execution by worker threads (task queue).</p>
    </div></section>
    <section class="sd-block" data-sec="interview"><h2 class="sd-h2">3. Interview Q&amp;A</h2><div class="sd-block-body">
      <details class="sd-faq"><summary>What does encapsulating a request enable?</summary><div>Queueing/scheduling, logging (for replay/audit), retry, undo/redo (store inverse), and decoupling the invoker from the receiver — the request becomes a first-class object.</div></details>
      <details class="sd-faq"><summary>How do you implement undo?</summary><div>Each command stores enough state to reverse itself (inverse operation or a memento of prior state); the invoker keeps a history stack and calls <code>undo()</code> in reverse order.</div></details>
      <details class="sd-faq"><summary>Real-world uses?</summary><div>GUI actions/macros, transactional operations, job/task queues, the CQRS "command" side, and remote procedure invocations.</div></details>
      <div class="sd-callout tip"><span class="sd-callout-l">Key takeaway</span>Wrap an action + params as an object → queue, log, schedule, undo. Invoker, command, receiver are decoupled.</div>
    </div></section>
  `,

  "state": `
    <section class="sd-block" data-sec="overview"><h2 class="sd-h2">1. Overview</h2><div class="sd-block-body">
      <p>The <strong>State</strong> pattern lets an object alter its behaviour when its internal state changes — it appears to change class. Each state is a class encapsulating the behaviour and the legal transitions for that state, replacing large <code>if/switch</code> blocks (used in ATM, order/elevator FSMs).</p>
    </div></section>
    <section class="sd-block" data-sec="java"><h2 class="sd-h2">2. Implementation</h2><div class="sd-block-body">
      <pre><code class="language-java">interface State { void next(Order ctx); void cancel(Order ctx); }
class Placed implements State {
    public void next(Order o){ o.setState(new Shipped()); }
    public void cancel(Order o){ o.setState(new Cancelled()); }
}
class Shipped implements State {
    public void next(Order o){ o.setState(new Delivered()); }
    public void cancel(Order o){ throw new IllegalStateException("Cannot cancel a shipped order"); }
}
class Delivered implements State { public void next(Order o){} public void cancel(Order o){ throw new IllegalStateException(); } }
class Cancelled implements State { public void next(Order o){ throw new IllegalStateException(); } public void cancel(Order o){} }

class Order {
    private State state = new Placed();
    public void setState(State s){ this.state = s; }
    public void next(){ state.next(this); }       // behaviour depends on current state
    public void cancel(){ state.cancel(this); }
}</code></pre>
    </div></section>
    <section class="sd-block" data-sec="interview"><h2 class="sd-h2">3. Interview Q&amp;A</h2><div class="sd-block-body">
      <details class="sd-faq"><summary>State vs Strategy?</summary><div>Same structure (delegate to an object), different intent. Strategy is selected externally to choose an algorithm; State transitions internally to model a lifecycle, with each state deciding the next.</div></details>
      <details class="sd-faq"><summary>Why use it over an enum + switch?</summary><div>A switch-on-status scatters transition logic and grows unwieldy. State encapsulates each state's behaviour and legal transitions in its own class (SRP/OCP), and illegal transitions are rejected per state.</div></details>
      <details class="sd-faq"><summary>Real examples?</summary><div>ATM workflow, order/shipment lifecycle, elevator (Idle/Moving/Door), TCP connection states, media player (Playing/Paused/Stopped).</div></details>
      <div class="sd-callout tip"><span class="sd-callout-l">Key takeaway</span>Each state = a class with its behaviour + legal transitions; the context delegates to the current state. Replaces giant status switches (FSMs).</div>
    </div></section>
  `,

  "mediator": `
    <section class="sd-block" data-sec="overview"><h2 class="sd-h2">1. Overview</h2><div class="sd-block-body">
      <p>The <strong>Mediator</strong> centralizes communication between objects so they don't refer to each other directly — turning a tangled many-to-many web into a star through one mediator. Reduces coupling; used in chat rooms, air-traffic control, UI dialogs, and workflow coordinators.</p>
    </div></section>
    <section class="sd-block" data-sec="java"><h2 class="sd-h2">2. Implementation — chat room</h2><div class="sd-block-body">
      <pre><code class="language-java">interface ChatMediator { void send(String msg, User from); void register(User u); }
class ChatRoom implements ChatMediator {
    private final java.util.List&lt;User&gt; users = new java.util.ArrayList&lt;&gt;();
    public void register(User u){ users.add(u); }
    public void send(String msg, User from){
        for (User u : users) if (u != from) u.receive(msg);   // mediator routes
    }
}
class User {
    private final ChatMediator room; private final String name;
    User(ChatMediator room, String name){ this.room = room; this.name = name; room.register(this); }
    public void send(String msg){ room.send(name + ": " + msg, this); }  // user knows only the mediator
    public void receive(String msg){ /* display */ }
}</code></pre>
    </div></section>
    <section class="sd-block" data-sec="interview"><h2 class="sd-h2">3. Interview Q&amp;A</h2><div class="sd-block-body">
      <details class="sd-faq"><summary>What problem does Mediator solve?</summary><div>It eliminates direct N×N references between colleagues by routing all interactions through one mediator — reducing coupling and making interactions easier to change/observe.</div></details>
      <details class="sd-faq"><summary>Mediator vs Observer?</summary><div>Observer broadcasts one→many on state change. Mediator coordinates many↔many interactions with logic about <em>how</em> components talk. A risk: the mediator can become a god-object if overloaded.</div></details>
      <div class="sd-callout tip"><span class="sd-callout-l">Key takeaway</span>Route inter-object communication through one mediator to cut coupling. Watch for it becoming a god-object.</div>
    </div></section>
  `,

  "memento": `
    <section class="sd-block" data-sec="overview"><h2 class="sd-h2">1. Overview</h2><div class="sd-block-body">
      <p>The <strong>Memento</strong> captures and externalizes an object's internal state so it can be restored later — without violating encapsulation. It's the engine behind <strong>undo/redo</strong>, checkpoints, and savepoints.</p>
    </div></section>
    <section class="sd-block" data-sec="java"><h2 class="sd-h2">2. Implementation</h2><div class="sd-block-body">
      <pre><code class="language-java">// Originator
class TextEditor {
    private String content = "";
    public void type(String t){ content += t; }
    public Memento save(){ return new Memento(content); }       // snapshot
    public void restore(Memento m){ this.content = m.state(); }  // rollback
    public record Memento(String state) {}                       // opaque to caretaker
}
// Caretaker holds mementos but never inspects them
class History {
    private final java.util.Deque&lt;TextEditor.Memento&gt; stack = new java.util.ArrayDeque&lt;&gt;();
    public void push(TextEditor.Memento m){ stack.push(m); }
    public TextEditor.Memento pop(){ return stack.pop(); }
}</code></pre>
    </div></section>
    <section class="sd-block" data-sec="interview"><h2 class="sd-h2">3. Interview Q&amp;A</h2><div class="sd-block-body">
      <details class="sd-faq"><summary>How does Memento preserve encapsulation?</summary><div>The memento exposes the state only to its originator (which created it); the caretaker stores it opaquely and can't read/modify the internals — so undo doesn't leak private fields.</div></details>
      <details class="sd-faq"><summary>Memento vs Command for undo?</summary><div>Memento snapshots full state to restore (simple, can be memory-heavy). Command stores the inverse operation (compact, but each command must know how to undo). Often combined.</div></details>
      <details class="sd-faq"><summary>Downside?</summary><div>Memory cost if state is large or snapshots are frequent — mitigate with incremental/diff mementos or limited history.</div></details>
      <div class="sd-callout tip"><span class="sd-callout-l">Key takeaway</span>Snapshot &amp; restore state without breaking encapsulation. Originator creates mementos; caretaker stores them opaquely. Powers undo/redo.</div>
    </div></section>
  `,

  "template-method": `
    <section class="sd-block" data-sec="overview"><h2 class="sd-h2">1. Overview</h2><div class="sd-block-body">
      <p>The <strong>Template Method</strong> defines the skeleton of an algorithm in a base class, deferring specific steps to subclasses. The overall structure is fixed; subclasses fill in the variable parts. It enforces a process while allowing customization (the "Hollywood principle": don't call us, we'll call you).</p>
    </div></section>
    <section class="sd-block" data-sec="java"><h2 class="sd-h2">2. Implementation</h2><div class="sd-block-body">
      <pre><code class="language-java">abstract class DataImporter {
    // template method — fixed skeleton, final so subclasses can't reorder
    public final void importData(String path){
        var raw = read(path);          // varying step
        var clean = validate(raw);     // varying step
        save(clean);                   // varying step
        afterImport();                 // hook (optional)
    }
    protected abstract java.util.List&lt;String&gt; read(String path);
    protected abstract java.util.List&lt;String&gt; validate(java.util.List&lt;String&gt; rows);
    protected abstract void save(java.util.List&lt;String&gt; rows);
    protected void afterImport(){ /* default no-op hook */ }
}
class CsvImporter extends DataImporter {
    protected java.util.List&lt;String&gt; read(String p){ return java.util.List.of(/* parse CSV */); }
    protected java.util.List&lt;String&gt; validate(java.util.List&lt;String&gt; r){ return r; }
    protected void save(java.util.List&lt;String&gt; r){ /* persist */ }
}</code></pre>
    </div></section>
    <section class="sd-block" data-sec="interview"><h2 class="sd-h2">3. Interview Q&amp;A</h2><div class="sd-block-body">
      <details class="sd-faq"><summary>Template Method vs Strategy?</summary><div>Template Method uses inheritance — the algorithm skeleton is fixed in a base class, subclasses override steps (compile-time). Strategy uses composition — swap the whole algorithm at runtime. Strategy is more flexible; Template Method enforces a fixed structure.</div></details>
      <details class="sd-faq"><summary>Where do you see it?</summary><div>Spring's <code>JdbcTemplate</code>/<code>RestTemplate</code>, servlet <code>HttpServlet.service()</code> dispatching to doGet/doPost, JUnit lifecycle (setup/test/teardown), framework callbacks generally.</div></details>
      <div class="sd-callout tip"><span class="sd-callout-l">Key takeaway</span>Fix the algorithm skeleton in a base class; subclasses fill in steps/hooks. Inheritance-based; enforces process. Strategy is the composition alternative.</div>
    </div></section>
  `,

  "visitor": `
    <section class="sd-block" data-sec="overview"><h2 class="sd-h2">1. Overview</h2><div class="sd-block-body">
      <p>The <strong>Visitor</strong> pattern lets you add new operations to an object structure without modifying the element classes. You define the operation in a separate <em>visitor</em>; each element "accepts" a visitor and dispatches to the right method (double dispatch). Great when the structure is stable but operations change often (AST traversal, reports).</p>
    </div></section>
    <section class="sd-block" data-sec="java"><h2 class="sd-h2">2. Implementation</h2><div class="sd-block-body">
      <pre><code class="language-java">interface Visitor { void visit(Circle c); void visit(Square s); }
interface Shape { void accept(Visitor v); }                 // double dispatch
class Circle implements Shape { double r; public void accept(Visitor v){ v.visit(this); } }
class Square implements Shape { double side; public void accept(Visitor v){ v.visit(this); } }

// New operation = new visitor, NO change to shape classes
class AreaVisitor implements Visitor {
    double total = 0;
    public void visit(Circle c){ total += Math.PI * c.r * c.r; }
    public void visit(Square s){ total += s.side * s.side; }
}
// Usage
var shapes = java.util.List.&lt;Shape&gt;of(new Circle(), new Square());
var area = new AreaVisitor();
shapes.forEach(s -&gt; s.accept(area));</code></pre>
      <p>In modern Java, <strong>sealed interfaces + switch pattern matching</strong> often replace Visitor more cleanly.</p>
    </div></section>
    <section class="sd-block" data-sec="interview"><h2 class="sd-h2">3. Interview Q&amp;A</h2><div class="sd-block-body">
      <details class="sd-faq"><summary>What problem does Visitor solve?</summary><div>Adding operations across a class hierarchy without touching each class. Define the new behaviour once in a visitor; elements just <code>accept</code> it. Trades easy new <em>operations</em> for hard new <em>element types</em> (every visitor must add a method).</div></details>
      <details class="sd-faq"><summary>What is double dispatch?</summary><div>The executed method depends on two types: the element (via <code>accept</code>) and the visitor (via overloaded <code>visit</code>). Java's single dispatch needs this two-step to resolve both.</div></details>
      <details class="sd-faq"><summary>Modern alternative?</summary><div>Sealed types + exhaustive <code>switch</code> pattern matching (Java 21) gives similar "add operation externally" benefits with less boilerplate.</div></details>
      <div class="sd-callout tip"><span class="sd-callout-l">Key takeaway</span>Add operations to a stable structure without editing elements, via double dispatch (accept/visit). Hard to add new element types. Sealed switch is the modern alternative.</div>
    </div></section>
  `

});

/* ════════════════════════════ STRUCTURAL PATTERNS ════════════════════════════ */
Object.assign(window.SD_CONTENT, {

  "decorator": `
    <section class="sd-block" data-sec="overview"><h2 class="sd-h2">1. Overview</h2><div class="sd-block-body">
      <p>The <strong>Decorator</strong> attaches additional responsibilities to an object dynamically by wrapping it in another object with the same interface. It's a flexible alternative to subclassing for extending behaviour — used in Java I/O streams, the <code>AsyncAppender</code> logger, and resilience wrappers.</p>
    </div></section>
    <section class="sd-block" data-sec="java"><h2 class="sd-h2">2. Implementation</h2><div class="sd-block-body">
      <pre><code class="language-java">interface Coffee { double cost(); String desc(); }
class SimpleCoffee implements Coffee { public double cost(){ return 2.0; } public String desc(){ return "coffee"; } }

// Base decorator wraps a Coffee and IS a Coffee
abstract class CoffeeDecorator implements Coffee {
    protected final Coffee inner;
    CoffeeDecorator(Coffee inner){ this.inner = inner; }
}
class Milk extends CoffeeDecorator {
    Milk(Coffee c){ super(c); }
    public double cost(){ return inner.cost() + 0.5; }
    public String desc(){ return inner.desc() + " + milk"; }
}
class Sugar extends CoffeeDecorator {
    Sugar(Coffee c){ super(c); }
    public double cost(){ return inner.cost() + 0.2; }
    public String desc(){ return inner.desc() + " + sugar"; }
}
// Stack decorators dynamically:
Coffee order = new Sugar(new Milk(new SimpleCoffee()));   // coffee + milk + sugar = 2.7
// cf. java.io: new BufferedReader(new InputStreamReader(new FileInputStream(f)))</code></pre>
    </div></section>
    <section class="sd-block" data-sec="interview"><h2 class="sd-h2">3. Interview Q&amp;A</h2><div class="sd-block-body">
      <details class="sd-faq"><summary>Decorator vs inheritance?</summary><div>Inheritance adds behaviour at compile time and explodes into many subclasses for combinations (MilkCoffee, SugarMilkCoffee…). Decorator composes behaviour at runtime by stacking wrappers — flexible, no class explosion.</div></details>
      <details class="sd-faq"><summary>Decorator vs Proxy?</summary><div>Same structure (wrap same interface). Decorator <em>adds behaviour/responsibilities</em>; Proxy <em>controls access</em> (lazy load, security, remote) without changing functionality.</div></details>
      <details class="sd-faq"><summary>Real example in the JDK?</summary><div>java.io streams (BufferedInputStream wraps FileInputStream), <code>Collections.unmodifiableList</code>, and Spring's transactional/caching wrappers.</div></details>
      <div class="sd-callout tip"><span class="sd-callout-l">Key takeaway</span>Wrap an object in same-interface decorators to add behaviour at runtime — composable, avoids subclass explosion. java.io is the canonical example.</div>
    </div></section>
  `,

  "adapter": `
    <section class="sd-block" data-sec="overview"><h2 class="sd-h2">1. Overview</h2><div class="sd-block-body">
      <p>The <strong>Adapter</strong> converts one interface into another that a client expects — letting incompatible classes work together. It's the glue when integrating third-party/legacy code: wrap the foreign API in an adapter that implements your interface.</p>
    </div></section>
    <section class="sd-block" data-sec="java"><h2 class="sd-h2">2. Implementation</h2><div class="sd-block-body">
      <pre><code class="language-java">// Your app expects this:
interface PaymentProcessor { void pay(java.math.BigDecimal amount); }

// Third-party SDK with an incompatible API (can't change it):
class StripeSdk { void makeCharge(long cents, String currency){ /* ... */ } }

// Adapter implements YOUR interface, delegates to the SDK
class StripeAdapter implements PaymentProcessor {
    private final StripeSdk stripe = new StripeSdk();
    public void pay(java.math.BigDecimal amount){
        long cents = amount.movePointRight(2).longValueExact();   // translate the call
        stripe.makeCharge(cents, "USD");
    }
}
// Client depends only on PaymentProcessor; swap adapters for PayPal/Razorpay freely.</code></pre>
    </div></section>
    <section class="sd-block" data-sec="interview"><h2 class="sd-h2">3. Interview Q&amp;A</h2><div class="sd-block-body">
      <details class="sd-faq"><summary>When use Adapter?</summary><div>To integrate a class whose interface you can't change (third-party SDK, legacy code) with a client that expects a different interface. The adapter translates between them.</div></details>
      <details class="sd-faq"><summary>Adapter vs Facade?</summary><div>Adapter makes an existing interface usable through a <em>different expected</em> interface (1:1 translation). Facade provides a <em>simplified</em> interface over a complex subsystem (many classes → one easy API).</div></details>
      <details class="sd-faq"><summary>Object adapter vs class adapter?</summary><div>Object adapter uses composition (holds the adaptee — preferred in Java). Class adapter uses multiple inheritance (not available in Java for classes).</div></details>
      <div class="sd-callout tip"><span class="sd-callout-l">Key takeaway</span>Translate an incompatible interface into the one your client expects. The integration glue for third-party/legacy APIs.</div>
    </div></section>
  `,

  "facade": `
    <section class="sd-block" data-sec="overview"><h2 class="sd-h2">1. Overview</h2><div class="sd-block-body">
      <p>The <strong>Facade</strong> provides a single, simplified interface to a complex subsystem of many classes. Clients use the easy facade instead of orchestrating the internals — reducing coupling and cognitive load. Service classes in layered apps are often facades.</p>
    </div></section>
    <section class="sd-block" data-sec="java"><h2 class="sd-h2">2. Implementation</h2><div class="sd-block-body">
      <pre><code class="language-java">// Complex subsystem
class InventoryService { boolean reserve(String sku, int qty){ return true; } }
class PaymentService { String charge(String user, java.math.BigDecimal amt){ return "pay-1"; } }
class ShippingService { void schedule(String orderId){ } }
class NotificationService { void confirm(String user){ } }

// Facade — one simple method orchestrates the subsystem
class OrderFacade {
    private final InventoryService inv; private final PaymentService pay;
    private final ShippingService ship; private final NotificationService notify;
    OrderFacade(InventoryService i, PaymentService p, ShippingService s, NotificationService n){ inv=i; pay=p; ship=s; notify=n; }

    public String placeOrder(String user, String sku, int qty, java.math.BigDecimal amt){
        if (!inv.reserve(sku, qty)) throw new IllegalStateException("Out of stock");
        String payId = pay.charge(user, amt);
        String orderId = "ord-" + payId;
        ship.schedule(orderId);
        notify.confirm(user);
        return orderId;                       // client just calls placeOrder()
    }
}</code></pre>
    </div></section>
    <section class="sd-block" data-sec="interview"><h2 class="sd-h2">3. Interview Q&amp;A</h2><div class="sd-block-body">
      <details class="sd-faq"><summary>Facade vs Adapter?</summary><div>Facade simplifies (hides a complex subsystem behind one easy interface). Adapter converts (makes one interface match another). Facade is about ease; Adapter is about compatibility.</div></details>
      <details class="sd-faq"><summary>Does a facade hide all subsystem access?</summary><div>No — it offers a convenient entry point but doesn't prevent advanced clients from using subsystem classes directly when needed.</div></details>
      <details class="sd-faq"><summary>Where do you see facades?</summary><div>Spring <code>@Service</code> classes coordinating repositories/clients, SLF4J over logging backends, and SDK "client" classes wrapping HTTP details.</div></details>
      <div class="sd-callout tip"><span class="sd-callout-l">Key takeaway</span>One simple interface over a complex subsystem; reduces coupling. Service-layer classes are typically facades.</div>
    </div></section>
  `,

  "proxy": `
    <section class="sd-block" data-sec="overview"><h2 class="sd-h2">1. Overview</h2><div class="sd-block-body">
      <p>A <strong>Proxy</strong> is a surrogate that controls access to another object, implementing the same interface. Variants: <em>virtual</em> (lazy creation), <em>protection</em> (access control), <em>remote</em> (stub for a remote object), and <em>smart</em> (logging/caching/ref-counting). It's how Spring AOP (<code>@Transactional</code>, <code>@Cacheable</code>) works under the hood.</p>
    </div></section>
    <section class="sd-block" data-sec="java"><h2 class="sd-h2">2. Implementation — caching proxy</h2><div class="sd-block-body">
      <pre><code class="language-java">interface ImageService { byte[] load(String id); }
class RealImageService implements ImageService {
    public byte[] load(String id){ /* expensive disk/network read */ return new byte[0]; }
}
// Smart proxy: same interface, adds caching + lazy access control
class CachingImageProxy implements ImageService {
    private final ImageService real = new RealImageService();
    private final java.util.Map&lt;String, byte[]&gt; cache = new java.util.concurrent.ConcurrentHashMap&lt;&gt;();
    public byte[] load(String id){
        return cache.computeIfAbsent(id, real::load);   // control + augment access
    }
}</code></pre>
      <p><strong>Spring:</strong> annotations like <code>@Transactional</code> create a dynamic proxy (JDK/CGLIB) that wraps your bean — begin/commit transaction around the real method. That's why self-invocation bypasses it.</p>
    </div></section>
    <section class="sd-block" data-sec="interview"><h2 class="sd-h2">3. Interview Q&amp;A</h2><div class="sd-block-body">
      <details class="sd-faq"><summary>Proxy vs Decorator?</summary><div>Both wrap an object with the same interface. Decorator <em>adds new behaviour/responsibilities</em>; Proxy <em>controls access</em> to the real object (lazy, security, remote, caching) without changing its core function.</div></details>
      <details class="sd-faq"><summary>How does Spring use proxies?</summary><div>AOP-based features (<code>@Transactional</code>, <code>@Cacheable</code>, <code>@Async</code>, security) wrap beans in JDK dynamic proxies (interface) or CGLIB subclasses (class), intercepting calls to add cross-cutting behaviour.</div></details>
      <details class="sd-faq"><summary>Why does self-invocation skip @Transactional?</summary><div>The annotation lives on the proxy; an internal <code>this.method()</code> call bypasses the proxy, so the interceptor never runs. Call via the injected proxy reference instead.</div></details>
      <div class="sd-callout tip"><span class="sd-callout-l">Key takeaway</span>Same-interface surrogate that controls access (lazy/security/remote/caching). Spring AOP (@Transactional/@Cacheable) is proxy-based — mind self-invocation.</div>
    </div></section>
  `,

  "composite": `
    <section class="sd-block" data-sec="overview"><h2 class="sd-h2">1. Overview</h2><div class="sd-block-body">
      <p>The <strong>Composite</strong> pattern composes objects into tree structures and lets clients treat individual objects (leaves) and groups (composites) uniformly through one interface. Perfect for hierarchies: file systems, UI component trees, org charts, menus.</p>
    </div></section>
    <section class="sd-block" data-sec="java"><h2 class="sd-h2">2. Implementation — file system</h2><div class="sd-block-body">
      <pre><code class="language-java">interface FileNode { int size(); }                    // common interface
class FileLeaf implements FileNode {                  // leaf
    private final int bytes;
    FileLeaf(int bytes){ this.bytes = bytes; }
    public int size(){ return bytes; }
}
class Directory implements FileNode {                 // composite
    private final java.util.List&lt;FileNode&gt; children = new java.util.ArrayList&lt;&gt;();
    public void add(FileNode n){ children.add(n); }
    public int size(){                                // recurse uniformly over children
        return children.stream().mapToInt(FileNode::size).sum();
    }
}
// Client treats a file and a directory the same:
Directory root = new Directory();
root.add(new FileLeaf(100));
Directory sub = new Directory(); sub.add(new FileLeaf(50));
root.add(sub);
int total = root.size();   // 150 — recurses the tree transparently</code></pre>
    </div></section>
    <section class="sd-block" data-sec="interview"><h2 class="sd-h2">3. Interview Q&amp;A</h2><div class="sd-block-body">
      <details class="sd-faq"><summary>What problem does Composite solve?</summary><div>It lets clients treat a single object and a tree of objects uniformly (call <code>size()</code>/<code>render()</code> on either), so traversal/aggregation code doesn't branch on leaf vs container.</div></details>
      <details class="sd-faq"><summary>Where is it used?</summary><div>File systems, DOM/UI component trees, GUI menus, org charts, arithmetic expression trees, and graphics scene graphs.</div></details>
      <details class="sd-faq"><summary>Trade-off?</summary><div>Uniformity can over-generalize — leaves may expose child-management methods that don't apply (design choice: transparent vs safe composite).</div></details>
      <div class="sd-callout tip"><span class="sd-callout-l">Key takeaway</span>Tree of leaves + composites behind one interface; clients treat part and whole uniformly. Natural for hierarchies.</div>
    </div></section>
  `

});

/* ════════════════════════════ MESSAGING & STREAMING ════════════════════════════ */
Object.assign(window.SD_CONTENT, {

  "kafka-basics": `
    <section class="sd-block" data-sec="overview"><h2 class="sd-h2">1. Overview</h2><div class="sd-block-body">
      <p><strong>Apache Kafka</strong> is a distributed, durable, high-throughput <strong>event streaming platform</strong> — a partitioned, replicated commit log. Producers append events to topics; consumers read at their own pace; data is retained and replayable. It powers event-driven architectures, log aggregation, stream processing and data pipelines at companies like LinkedIn, Uber, Netflix.</p>
    </div></section>
    <section class="sd-block" data-sec="concepts"><h2 class="sd-h2">2. Core concepts</h2><div class="sd-block-body">
      <ul>
        <li><strong>Topic:</strong> a named stream of events, split into <strong>partitions</strong> (the unit of parallelism &amp; ordering).</li>
        <li><strong>Partition:</strong> an ordered, immutable, append-only log. Order is guaranteed <em>within</em> a partition only.</li>
        <li><strong>Offset:</strong> a consumer's position in a partition (committed so it can resume).</li>
        <li><strong>Producer:</strong> writes events; a <strong>key</strong> decides the partition (same key → same partition → ordered).</li>
        <li><strong>Consumer group:</strong> consumers sharing the load — each partition is consumed by exactly one member, enabling horizontal scaling.</li>
        <li><strong>Replication:</strong> each partition has a leader + follower replicas across brokers for durability/HA.</li>
        <li><strong>Retention:</strong> events persist for a time/size, so consumers can replay (unlike a traditional queue).</li>
      </ul>
      <pre class="mermaid">graph TD
  P[Producers] -->|key→partition| T[Topic]
  T --> P0[Partition 0]
  T --> P1[Partition 1]
  T --> P2[Partition 2]
  P0 --> C1[Consumer A - group G]
  P1 --> C2[Consumer B - group G]
  P2 --> C1</pre>
    </div></section>
    <section class="sd-block" data-sec="java"><h2 class="sd-h2">3. Spring Kafka</h2><div class="sd-block-body">
      <pre><code class="language-java">@Service
public class OrderEventProducer {
    private final org.springframework.kafka.core.KafkaTemplate&lt;String, OrderEvent&gt; kafka;
    public OrderEventProducer(org.springframework.kafka.core.KafkaTemplate&lt;String, OrderEvent&gt; k){ this.kafka = k; }
    public void publish(OrderEvent e){
        kafka.send("orders", e.orderId(), e);     // key = orderId → per-order ordering
    }
}
@Component
public class OrderEventConsumer {
    @org.springframework.kafka.annotation.KafkaListener(topics = "orders", groupId = "fulfillment")
    public void consume(OrderEvent e){
        process(e);     // at-least-once → must be idempotent (see Idempotency)
    }
}</code></pre>
      <pre><code class="language-properties">spring.kafka.consumer.enable-auto-commit=false   # commit after successful processing
spring.kafka.consumer.auto-offset-reset=earliest
spring.kafka.producer.acks=all                   # wait for replicas → durability</code></pre>
    </div></section>
    <section class="sd-block" data-sec="delivery"><h2 class="sd-h2">4. Delivery semantics & ordering</h2><div class="sd-block-body">
      <ul>
        <li><strong>At-most-once:</strong> commit offset before processing (may lose messages).</li>
        <li><strong>At-least-once</strong> (default): process then commit (may duplicate on retry → consumers must be idempotent).</li>
        <li><strong>Exactly-once:</strong> Kafka transactions + idempotent producer (<code>acks=all</code>, <code>enable.idempotence=true</code>) for read-process-write pipelines.</li>
        <li><strong>Ordering:</strong> guaranteed within a partition. Use a meaningful key (e.g. userId) to keep related events ordered.</li>
      </ul>
    </div></section>
    <section class="sd-block" data-sec="interview"><h2 class="sd-h2">5. Interview Q&amp;A</h2><div class="sd-block-body">
      <details class="sd-faq"><summary>How does Kafka scale and keep order?</summary><div>Topics are partitioned; each partition is consumed by one member of a consumer group (parallelism). Order is preserved within a partition, so events that must be ordered share a key → same partition.</div></details>
      <details class="sd-faq"><summary>Queue vs log — how is Kafka different from RabbitMQ?</summary><div>Kafka is a durable, replayable log (messages aren't deleted on consume; consumers track offsets; multiple groups read independently). A traditional queue deletes on ack and pushes to consumers.</div></details>
      <details class="sd-faq"><summary>How do you achieve exactly-once?</summary><div>Idempotent producer + transactions for the read-process-write loop, or at-least-once delivery with an idempotent consumer (dedupe by event id) — the more common practical choice.</div></details>
      <details class="sd-faq"><summary>What is consumer lag?</summary><div>The gap between the latest offset and the consumer's committed offset — how far behind a consumer is. Monitor it (Burrow/Prometheus); rising lag means consumers can't keep up → add partitions/consumers.</div></details>
      <details class="sd-faq"><summary>What happens if a consumer in a group dies?</summary><div>A rebalance reassigns its partitions to other members so processing continues (briefly paused during rebalance).</div></details>
      <div class="sd-callout tip"><span class="sd-callout-l">Key takeaway</span>Kafka = partitioned, replicated, replayable log. Scale via partitions + consumer groups; order within a partition (use keys); at-least-once by default → idempotent consumers; watch lag.</div>
    </div></section>
  `,

  "queue-rabbit-vs-kafka": `
    <section class="sd-block" data-sec="overview"><h2 class="sd-h2">1. Overview</h2><div class="sd-block-body">
      <p><strong>RabbitMQ</strong> (a traditional message broker / smart queue) and <strong>Kafka</strong> (a distributed log / dumb pipe) solve overlapping but different problems. RabbitMQ excels at flexible routing and task queues; Kafka excels at high-throughput streaming and replay. Picking correctly is a frequent interview question.</p>
    </div></section>
    <section class="sd-block" data-sec="compare"><h2 class="sd-h2">2. Comparison</h2><div class="sd-block-body">
      <table><thead><tr><th>Aspect</th><th>RabbitMQ</th><th>Kafka</th></tr></thead><tbody>
        <tr><td>Model</td><td>Message broker (smart broker, dumb consumer)</td><td>Distributed log (dumb broker, smart consumer)</td></tr>
        <tr><td>Consume</td><td>Push; message deleted on ack</td><td>Pull; retained &amp; replayable (offsets)</td></tr>
        <tr><td>Routing</td><td>Rich (exchanges: direct/topic/fanout/headers)</td><td>Simple (topic + partition by key)</td></tr>
        <tr><td>Throughput</td><td>Tens of K msg/s</td><td>Millions/s</td></tr>
        <tr><td>Ordering</td><td>Per-queue</td><td>Per-partition</td></tr>
        <tr><td>Replay</td><td>No (gone after ack)</td><td>Yes (retention)</td></tr>
        <tr><td>Best for</td><td>Task queues, RPC, complex routing, per-message priority</td><td>Event streaming, log/metrics pipelines, event sourcing, high volume</td></tr>
      </tbody></table>
    </div></section>
    <section class="sd-block" data-sec="when"><h2 class="sd-h2">3. When to choose which</h2><div class="sd-block-body">
      <ul>
        <li><strong>RabbitMQ:</strong> background jobs/work queues, request/reply, complex routing rules, per-message TTL/priority, lower volume.</li>
        <li><strong>Kafka:</strong> event-driven microservices, streaming analytics, audit/event logs, replay needs, very high throughput, multiple independent consumers of the same stream.</li>
      </ul>
    </div></section>
    <section class="sd-block" data-sec="interview"><h2 class="sd-h2">4. Interview Q&amp;A</h2><div class="sd-block-body">
      <details class="sd-faq"><summary>"Smart broker / dumb consumer" vs "dumb broker / smart consumer"?</summary><div>RabbitMQ does routing/tracking/dispatch (broker is smart; consumers just ack). Kafka brokers just store the log; consumers track their own offset and decide what/when to read (consumer is smart). This is why Kafka scales reads to many independent consumer groups.</div></details>
      <details class="sd-faq"><summary>Can RabbitMQ replay messages?</summary><div>Not natively — once acked, a message is removed. Kafka retains messages for the retention period, so you can rewind offsets and reprocess.</div></details>
      <details class="sd-faq"><summary>Which for an order-processing task queue with priorities?</summary><div>RabbitMQ — it supports priority queues, flexible routing, and per-message ack/requeue, which fit discrete tasks better than a partitioned log.</div></details>
      <div class="sd-callout tip"><span class="sd-callout-l">Key takeaway</span>RabbitMQ = flexible routing + task queues (delete on ack). Kafka = high-throughput, replayable streaming log (retention + offsets). Choose by routing complexity vs throughput/replay.</div>
    </div></section>
  `,

  "sqs-basics": `
    <section class="sd-block" data-sec="overview"><h2 class="sd-h2">1. Overview</h2><div class="sd-block-body">
      <p><strong>Amazon SQS</strong> is a fully-managed, serverless message queue. No brokers to run — it scales automatically and you pay per request. Two types: <strong>Standard</strong> (high throughput, at-least-once, best-effort ordering) and <strong>FIFO</strong> (exactly-once processing, strict ordering, lower throughput).</p>
    </div></section>
    <section class="sd-block" data-sec="concepts"><h2 class="sd-h2">2. Core concepts</h2><div class="sd-block-body">
      <ul>
        <li><strong>Visibility timeout:</strong> when a consumer receives a message, it's hidden from others for N seconds; if not deleted within that window (processing failed), it reappears for redelivery.</li>
        <li><strong>Long polling:</strong> wait up to 20s for messages → fewer empty responses, lower cost.</li>
        <li><strong>Dead-Letter Queue (DLQ):</strong> after N failed receives (<code>maxReceiveCount</code>), the message moves to a DLQ for inspection — prevents poison-message loops.</li>
        <li><strong>Delay queues / message timers:</strong> postpone delivery.</li>
        <li>Consumers <strong>poll</strong> (pull); you must explicitly <code>DeleteMessage</code> after success.</li>
      </ul>
    </div></section>
    <section class="sd-block" data-sec="java"><h2 class="sd-h2">3. Java (AWS SDK v2)</h2><div class="sd-block-body">
      <pre><code class="language-java">software.amazon.awssdk.services.sqs.SqsClient sqs = software.amazon.awssdk.services.sqs.SqsClient.create();

// send
sqs.sendMessage(b -&gt; b.queueUrl(QUEUE_URL).messageBody("{\\"orderId\\":\\"123\\"}"));

// receive (long poll) → process → delete
var resp = sqs.receiveMessage(b -&gt; b.queueUrl(QUEUE_URL).maxNumberOfMessages(10).waitTimeSeconds(20));
for (var msg : resp.messages()) {
    try {
        process(msg.body());
        sqs.deleteMessage(b -&gt; b.queueUrl(QUEUE_URL).receiptHandle(msg.receiptHandle())); // ack
    } catch (Exception e) {
        // don't delete → message reappears after visibility timeout → eventually DLQ
    }
}</code></pre>
      <p><strong>Spring Cloud AWS:</strong> use <code>@SqsListener("queue-name")</code> for declarative consumption.</p>
    </div></section>
    <section class="sd-block" data-sec="interview"><h2 class="sd-h2">4. Interview Q&amp;A</h2><div class="sd-block-body">
      <details class="sd-faq"><summary>What is the visibility timeout for?</summary><div>To prevent two consumers from processing the same message: on receive it's hidden temporarily; the consumer must delete it before the timeout, else it's redelivered (assuming the consumer crashed).</div></details>
      <details class="sd-faq"><summary>Standard vs FIFO?</summary><div>Standard = nearly unlimited throughput, at-least-once delivery, best-effort ordering (duplicates/reorders possible). FIFO = strict ordering + exactly-once processing within a message group, but limited throughput (300–3000 msg/s). Choose FIFO only when order/dedup is required.</div></details>
      <details class="sd-faq"><summary>What's a DLQ and why?</summary><div>A dead-letter queue receives messages that fail processing <code>maxReceiveCount</code> times, isolating "poison" messages for debugging and stopping infinite redelivery loops.</div></details>
      <details class="sd-faq"><summary>Why long polling?</summary><div>Short polling returns immediately (often empty) and costs more API calls. Long polling waits for a message (up to 20s), reducing empty receives, latency, and cost.</div></details>
      <div class="sd-callout tip"><span class="sd-callout-l">Key takeaway</span>Managed pull queue; visibility timeout + delete = at-least-once; DLQ for poison messages; long polling for efficiency; Standard (scale) vs FIFO (order/dedup).</div>
    </div></section>
  `,

  "sqs-vs-rabbitmq": `
    <section class="sd-block" data-sec="overview"><h2 class="sd-h2">1. Overview</h2><div class="sd-block-body">
      <p>Both are message queues, but <strong>SQS</strong> is a fully-managed AWS service (zero ops) while <strong>RabbitMQ</strong> is a self-managed (or managed) broker with far richer routing and protocol support. The decision is largely operational simplicity vs control/features.</p>
    </div></section>
    <section class="sd-block" data-sec="compare"><h2 class="sd-h2">2. Comparison</h2><div class="sd-block-body">
      <table><thead><tr><th>Aspect</th><th>Amazon SQS</th><th>RabbitMQ</th></tr></thead><tbody>
        <tr><td>Management</td><td>Fully managed, serverless (no ops)</td><td>Self-hosted (or managed); you run/scale it</td></tr>
        <tr><td>Routing</td><td>Simple queue (no exchanges)</td><td>Rich: direct/topic/fanout/headers exchanges</td></tr>
        <tr><td>Protocol</td><td>AWS API (HTTPS)</td><td>AMQP, MQTT, STOMP</td></tr>
        <tr><td>Delivery model</td><td>Pull (poll)</td><td>Push to consumers</td></tr>
        <tr><td>Ordering/dedup</td><td>FIFO queues</td><td>Per-queue; plugins for more</td></tr>
        <tr><td>Scaling</td><td>Automatic, near-infinite</td><td>Manual (clustering, mirrored queues)</td></tr>
        <tr><td>Cost</td><td>Pay-per-request</td><td>Infra + ops cost</td></tr>
        <tr><td>Lock-in</td><td>AWS-specific</td><td>Portable / open source</td></tr>
      </tbody></table>
    </div></section>
    <section class="sd-block" data-sec="when"><h2 class="sd-h2">3. When to choose</h2><div class="sd-block-body">
      <ul>
        <li><strong>SQS:</strong> you're on AWS, want zero operational burden, elastic scale, and simple queueing (decouple producers/consumers, buffer spikes).</li>
        <li><strong>RabbitMQ:</strong> you need complex routing (topic/fanout), specific protocols (AMQP/MQTT), low-latency push, on-prem/multi-cloud portability, or fine-grained control.</li>
      </ul>
    </div></section>
    <section class="sd-block" data-sec="interview"><h2 class="sd-h2">4. Interview Q&amp;A</h2><div class="sd-block-body">
      <details class="sd-faq"><summary>Main reason to pick SQS?</summary><div>Operational simplicity: no servers to manage, automatic scaling, built-in durability/DLQ, pay-per-use — ideal when you're already on AWS and don't need complex routing.</div></details>
      <details class="sd-faq"><summary>Main reason to pick RabbitMQ?</summary><div>Advanced routing (exchanges), protocol flexibility (AMQP/MQTT/STOMP), push delivery, portability across clouds/on-prem, and finer control — at the cost of running it yourself.</div></details>
      <details class="sd-faq"><summary>Push vs pull difference here?</summary><div>RabbitMQ pushes messages to subscribed consumers (low latency, needs flow control/prefetch). SQS consumers poll (you control rate; pair with long polling).</div></details>
      <div class="sd-callout tip"><span class="sd-callout-l">Key takeaway</span>SQS = managed, simple, auto-scaling pull queue (AWS). RabbitMQ = feature-rich, portable, push broker you operate. Choose ops-simplicity vs routing/control.</div>
    </div></section>
  `

});
