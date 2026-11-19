---
layout: default
title: Downloads
description: Machine-readable specifications and collections.
---

Resources for developers integrating with the Proposal Module API.

{% if site.downloads.size > 0 %} {% for download in site.downloads %}

<div class="download-item">
  <div class="download-info">
    <h4>{{ download.title }}</h4>
    <p>{{ download.description }} &middot; {{ download.version }}{% if download.size %} ({{ download.size }}){% endif %}</p>
  </div>
  <a href="{{ download.file | relative_url }}" class="download-btn">Download</a>
</div>
{% endfor %}
{% else %}

<div class="callout callout-info">
<strong>Coming soon.</strong> Downloadable resources will be published here as they become available.
</div>

{% endif %}

The Postman collection is generated from the OpenAPI specification on every
build, so the two never drift apart.
