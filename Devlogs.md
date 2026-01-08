TODO:

almost done; now set up a help email, discord server and a website to deploy, and start going live.


Let's add an onboarding tutorial. It's just an animated popup with 'don't show this again' option and a close button.  It explains: Select a card, then drag to move. / Rotate/resize by click and dragging the relative UI.  / Double-click on the card to flip. / Pan the board by click and dragging with a mouse wheel, or alternatively just click+drag while holding the Ctrl key. / Zoom in and out by scrolling up/down with mouse while holding Ctrl key, or by clicking on the +/- UI.
(maybe animated as GIF)

Let's add Help icon button. It opens up a pop-up panel with four tabs: What / Why / How / Feedback : 
What is VisionBoard.co? / Why should I do this? /  How do I make a Vision Board? / Feedback



Let's add Versioning (v0.01, v0.02, ...) with update history logs. These logs should be visible by clicking on the version displayed in the footer.
Make this current one v0.01 - Briefly introduce what we have made so far.

For v0.02, we're going to implement Auto-save (browser cache). We will display in top left corner "Saved at {DateTime}" and "Saved History". This should save all settings, custom text, card placements, linked or uploaded images, as-is. Auto-save is triggered once every 30 seconds. If any metadata change is detected, it will save the checkpoint in Saved History.

For v0.03 - we're going to implement "Log in with Google". At first page visit, if not logged in already, we will show a pop-up near the Log In button: "Log in with Google to auto-save and sync". Since saving in local cache comes with limitations, we will remind un-logged users to log in everytime auto-save is triggered for local cache.





Log in with Pinterest
Log in with Discord

Alert / Notifications? (Maybe Premium)


Fetch Pinterest has problems (No media found)... it doesn't fetch a video pin.

If the image has been loaded/fetched and custom text has not been set, (i.e. "New Intention") remove the text.

Add Font stylization (Bold, Italic, Underline)

Spawn new cards with a little bit of randomness (position, rotation) - ideally the position of the new card should be somewhere empty near existing card.


Allow user to set upto 25 custom boards and save it. Allow user to select the "Default board" to open upon page visit. 
For this, we'll create a vertical bar to the left side of the page. This bar shows the boards the user has created. Upon first page arrival to a new user is just the one ready-made Vision Board. There is a button undernath the existing vision board that is shaped like an empty board with dotted outlines with a + button in the middle (Create New Board). This is where Onboarding tooltips will show up. Users can skip this. They can delete the template by hovering over a template and clicking on the delete button that appears to the top right corner of the template.



--

What is this space?

This space is for creating your Vision Board.

A vision board is a personal roadmap—a way to clarify what you want and stay connected to it over time. It can include images, words, quotes, affirmations, videos, or ideas that reflect your direction.

Because this is digital, you can:

Add images (or videos) from Pinterest

Log in with Google to save history and revisit past boards

Watch how your vision evolves over time

Use templates and add-ons created by the community to make the process more creative and enjoyable

This isn’t just about collecting inspiration—it’s about seeing your future more clearly.

Why should I do this?

Vision boards aren’t magic—but they do work when used intentionally.

They’re grounded in psychology:

Visualization helps strengthen mental pathways

Priming makes you more likely to notice relevant opportunities

Repetition reduces fear and friction around new actions

Like mental training used by athletes, vision boards support focus and motivation—especially when you pair them with real action and values you care about.

If you’re curious about the science, you can explore:

https://www.youtube.com/watch?v=id55BKWLZKM

https://youtu.be/ZJDOEFmTy0E?t=109

https://youtube.com/shorts/h4XPNq5Y1Ks

How do I make a Vision Board?

There’s no single right way.

A common approach:

Add images or words that resonate with you

Place them freely on the board

Flip cards to reflect on meaning using a template

Revisit and evolve the board over time

Digital boards make it easy to experiment:

One board for the year

Monthly boards (e.g. “February Vision Board”)

Revision boards to reflect on how things actually unfolded

You can even add real photos and notes later, turning your boards into a visual journal of your life.

Try different templates and find what works for you.

Feedback

LifeOS Studio is evolving with its community—and your input matters.

You can:

Share what feels helpful or confusing

Suggest features or templates

Report bugs or friction

Tell us what you wish existed

Join our Discord or email us at: _________

Thank you for using the Vision Board 💙